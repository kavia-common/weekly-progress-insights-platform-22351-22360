import React from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { getStoredTeam, storeTeamLocal, clearStoredTeam, setUserTeam as apiSetUserTeam, hasTeamApi } from '../services/teamService';

/**
 * PUBLIC_INTERFACE
 * useAuth - React hook to access authentication state and actions.
 */
export const AuthContext = React.createContext({
  user: null,
  session: null,
  role: null,
  loading: true,
  // Team selection
  team: null, // { id, name? } or null
  teamLoading: true,
  teamPersisted: false, // true if saved via backend; false when only local storage
  // PUBLIC_INTERFACE
  /** Returns true if the current role is "employee". */
  isEmployee: () => false,
  // PUBLIC_INTERFACE
  /** Returns true if the current role is "manager". */
  isManager: () => false,
  // PUBLIC_INTERFACE
  /** Returns true if the current role is "admin". */
  isAdmin: () => false,
  // PUBLIC_INTERFACE
  /** Returns true if role equals any of the provided role names. */
  hasRole: (_roles) => false,
  // PUBLIC_INTERFACE
  /** Set the current team; persists via backend when available, else stores locally. */
  setTeamSelection: async (_team) => {},
  // PUBLIC_INTERFACE
  /** Clear team selection from local state (and backend when available). */
  clearTeamSelection: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}

/**
 * Infer a role string from a Supabase user object or fallback rules.
 * Priority: app_metadata.role > user_metadata.role > email-based heuristic > "employee"
 */
function deriveRoleFromUser(user) {
  if (!user) return null;
  const appRole = user?.app_metadata?.role || user?.app_metadata?.roles?.[0];
  const metaRole = user?.user_metadata?.role || user?.user_metadata?.roles?.[0];
  const role = (appRole || metaRole || '').toString().toLowerCase().trim();

  if (role === 'admin' || role === 'manager' || role === 'employee') {
    return role;
  }

  // Placeholder mapping for environments without metadata
  const email = (user?.email || '').toLowerCase();
  if (email.includes('admin') || email.endsWith('+admin@test.com')) return 'admin';
  if (email.includes('manager') || email.includes('lead') || email.endsWith('+manager@test.com')) return 'manager';
  return 'employee';
}

/**
 * PUBLIC_INTERFACE
 * AuthProvider - Provides Supabase auth session, user state, role, and team via context,
 * subscribes to auth changes, and exposes team selection and signOut actions.
 *
 * Team selection logic:
 * - If user metadata contains team info (user_metadata.team_id or app_metadata.team_id), use it.
 * - Else, if localStorage has a selection, use it (teamPersisted=false).
 * - setTeamSelection persists via backend when available; otherwise stores locally and sets teamPersisted=false.
 */
export function AuthProvider({ children }) {
  const supabase = getSupabase();
  const [session, setSession] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Team state
  const [team, setTeam] = React.useState(null);
  const [teamPersisted, setTeamPersisted] = React.useState(false);
  const [teamLoading, setTeamLoading] = React.useState(true);

  // Helper to fetch role from profiles if metadata doesn't provide one
  const loadRoleFromProfiles = React.useCallback(
    async (u) => {
      if (!supabase || !u?.id) return null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, team_id, team_name')
          .eq('user_id', u.id)
          .single();
        if (error) {
          // eslint-disable-next-line no-console
          console.debug('[AuthContext] profiles lookup skipped/failed:', error.message);
          return { role: null, team: null };
        }
        const pRole = (data?.role || '').toString().toLowerCase().trim();
        let nextRole = null;
        if (pRole && ['employee', 'manager', 'admin'].includes(pRole)) {
          nextRole = pRole;
        }
        let nextTeam = null;
        if (data?.team_id) {
          nextTeam = { id: String(data.team_id), name: data?.team_name || '' };
        }
        return { role: nextRole, team: nextTeam };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug('[AuthContext] profiles lookup errored:', e?.message || e);
        return { role: null, team: null };
      }
    },
    [supabase]
  );

  // Initialize session on mount
  React.useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (!supabase) {
          // Supabase not configured - still allow local-only team selection
          if (mounted) {
            setSession(null);
            setUser(null);
            setRole(null);
            setLoading(false);
            // Team from local storage only
            const lsTeam = getStoredTeam();
            setTeam(lsTeam);
            setTeamPersisted(false);
            setTeamLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Error getting session:', error);
        }
        const nextSession = data?.session ?? null;
        const nextUser = nextSession?.user ?? null;

        if (mounted) {
          setSession(nextSession);
          setUser(nextUser);

          const initialRole = deriveRoleFromUser(nextUser);
          setRole(initialRole);
          setLoading(false);

          // Attempt to refine role/team from profiles
          let profileRole = null;
          let profileTeam = null;
          if (nextUser) {
            const fromProfiles = await loadRoleFromProfiles(nextUser);
            profileRole = fromProfiles?.role || null;
            profileTeam = fromProfiles?.team || null;
          }
          if (profileRole && profileRole !== initialRole) {
            setRole(profileRole);
          }

          // Team from user/app metadata or profiles, else local storage
          const metaTeamId =
            nextUser?.app_metadata?.team_id ||
            nextUser?.user_metadata?.team_id ||
            null;

          if (metaTeamId) {
            setTeam({ id: String(metaTeamId), name: nextUser?.user_metadata?.team_name || '' });
            setTeamPersisted(true);
          } else if (profileTeam) {
            setTeam(profileTeam);
            setTeamPersisted(true);
          } else {
            const lsTeam = getStoredTeam();
            setTeam(lsTeam);
            setTeamPersisted(false);
          }
          setTeamLoading(false);
        }

        // Subscribe to auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
          const currentUser = currentSession?.user ?? null;
          setSession(currentSession);
          setUser(currentUser);

          const initialRole2 = deriveRoleFromUser(currentUser);
          setRole(initialRole2);

          let profileRole2 = null;
          let profileTeam2 = null;
          if (currentUser) {
            const fromProfiles = await loadRoleFromProfiles(currentUser);
            profileRole2 = fromProfiles?.role || null;
            profileTeam2 = fromProfiles?.team || null;
          }
          if (profileRole2 && profileRole2 !== initialRole2) {
            setRole(profileRole2);
          }

          const metaTeamId2 =
            currentUser?.app_metadata?.team_id ||
            currentUser?.user_metadata?.team_id ||
            null;

          setTeamLoading(true);
          if (metaTeamId2) {
            setTeam({ id: String(metaTeamId2), name: currentUser?.user_metadata?.team_name || '' });
            setTeamPersisted(true);
            setTeamLoading(false);
          } else if (profileTeam2) {
            setTeam(profileTeam2);
            setTeamPersisted(true);
            setTeamLoading(false);
          } else {
            const lsTeam = getStoredTeam();
            setTeam(lsTeam);
            setTeamPersisted(false);
            setTeamLoading(false);
          }
        });

        return () => {
          listener?.subscription?.unsubscribe?.();
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth initialization failed:', e);
        if (mounted) {
          setLoading(false);
          setTeamLoading(false);
        }
      }
    }

    const cleanupPromise = initSession();

    return () => {
      mounted = false;
      void cleanupPromise;
    };
  }, [supabase, loadRoleFromProfiles]);

  const isEmployee = React.useCallback(() => role === 'employee', [role]);
  const isManager = React.useCallback(() => role === 'manager', [role]);
  const isAdmin = React.useCallback(() => role === 'admin', [role]);
  const hasRole = React.useCallback(
    (roles) => {
      const set = Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase()) : [String(roles || '').toLowerCase()];
      return role ? set.includes(role) : false;
    },
    [role]
  );

  // PUBLIC_INTERFACE
  const setTeamSelection = React.useCallback(
    async (nextTeam) => {
      if (!nextTeam || !nextTeam.id) return { persisted: false };
      // Attempt to persist via backend when available
      try {
        const { available } = hasTeamApi();
        if (available) {
          const res = await apiSetUserTeam(nextTeam.id);
          if (res?.available && res?.success) {
            setTeam({ id: String(nextTeam.id), name: nextTeam.name || '' });
            setTeamPersisted(true);
            // Clear local storage copy once persisted
            clearStoredTeam();
            return { persisted: true };
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug('[AuthContext] setUserTeam backend persist failed; falling back to local.', e?.message || e);
      }
      // Local-only fallback
      setTeam({ id: String(nextTeam.id), name: nextTeam.name || '' });
      setTeamPersisted(false);
      storeTeamLocal(nextTeam);
      return { persisted: false };
    },
    []
  );

  // PUBLIC_INTERFACE
  const clearTeamSelection = React.useCallback(async () => {
    try {
      clearStoredTeam();
    } catch {
      // ignore
    }
    setTeam(null);
    setTeamPersisted(false);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      session,
      role,
      loading,
      team,
      teamLoading,
      teamPersisted,
      isEmployee,
      isManager,
      isAdmin,
      hasRole,
      // PUBLIC_INTERFACE
      /** Set the current team and attempt to persist via backend if available. */
      setTeamSelection,
      // PUBLIC_INTERFACE
      /** Clear team selection from local-only storage and memory. */
      clearTeamSelection,
      // PUBLIC_INTERFACE
      /** Signs the user out of Supabase and resets the context. */
      signOut: async () => {
        if (!supabase) return;
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error signing out:', e);
        }
      },
    }),
    [user, session, role, loading, team, teamLoading, teamPersisted, isEmployee, isManager, isAdmin, hasRole, setTeamSelection, clearTeamSelection, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
