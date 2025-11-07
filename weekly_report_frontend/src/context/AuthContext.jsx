import React from 'react';
import { getSupabase, getSupabaseConfigStatus } from '../lib/supabaseClient';

/**
 * PUBLIC_INTERFACE
 * useAuth - React hook to access authentication state and actions.
 */
export const AuthContext = React.createContext({
  user: null,
  session: null,
  role: null,
  loading: true,
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
  signOut: async () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}

/**
 * Internal dev-gated logger for auth flow.
 * Use localStorage key "auth_debug" = "true" to force logs (in case NODE_ENV checks vary).
 */
function authDebugLog(...args) {
  try {
    const forced = typeof window !== 'undefined' && localStorage.getItem('auth_debug') === 'true';
    const dev = process.env.NODE_ENV !== 'production';
    if (dev || forced) {
      // eslint-disable-next-line no-console
      console.debug('[AUTH][DEBUG]', ...args);
    }
  } catch {
    // ignore storage access errors
  }
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
 * Resolve role with source information for debug logging (no behavior change).
 */
function resolveRoleWithSource(user) {
  if (!user) return { role: null, source: 'none' };
  const appRole = user?.app_metadata?.role || user?.app_metadata?.roles?.[0];
  const metaRole = user?.user_metadata?.role || user?.user_metadata?.roles?.[0];
  const baseRole = deriveRoleFromUser(user);

  let source = 'heuristic';
  if (appRole && ['employee', 'manager', 'admin'].includes(String(appRole).toLowerCase())) {
    source = 'app_metadata';
  } else if (metaRole && ['employee', 'manager', 'admin'].includes(String(metaRole).toLowerCase())) {
    source = 'user_metadata';
  }
  return { role: baseRole, source };
}

/**
 * PUBLIC_INTERFACE
 * AuthProvider - Provides Supabase auth session, user state, and role via context,
 * subscribes to auth changes, and exposes a signOut action.
 *
 * Enhancement:
 * - If role is not found in app_metadata/user_metadata, attempts to read from public.profiles.role
 *   for the authenticated user (requires an RLS policy that allows users to select their own row).
 */
export function AuthProvider({ children }) {
  const supabase = getSupabase();
  const [session, setSession] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // On mount: configuration snapshot (no secrets)
  React.useEffect(() => {
    const status = getSupabaseConfigStatus();
    authDebugLog('AuthProvider mount', {
      supabaseConfigured: status?.isConfigured,
      supabaseUrlPresent: Boolean(status?.url),
      keyPresent: Boolean(status?.hasKey),
      nodeEnv: process.env.NODE_ENV,
    });
    if (!supabase) {
      authDebugLog('Supabase client is not configured. Auth will remain unauthenticated.');
    } else {
      authDebugLog('Supabase client is available. Starting session hydration…');
    }
  }, [supabase]);

  // Helper to fetch role from profiles if metadata doesn't provide one
  const loadRoleFromProfiles = React.useCallback(
    async (u) => {
      if (!supabase || !u?.id) return null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', u.id)
          .single();
        if (error) {
          authDebugLog('profiles role lookup skipped/failed:', String(error.message || error));
          return null;
        }
        const pRole = (data?.role || '').toString().toLowerCase().trim();
        if (pRole && ['employee', 'manager', 'admin'].includes(pRole)) {
          authDebugLog('profiles role lookup success', { userId: u.id, role: pRole });
          return pRole;
        }
      } catch (e) {
        authDebugLog('profiles role lookup errored:', String(e?.message || e));
      }
      return null;
    },
    [supabase]
  );

  // Initialize session on mount
  React.useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (!supabase) {
          // Supabase not configured - remain unauthenticated but don't crash
          if (mounted) {
            authDebugLog('initSession: supabase missing -> set unauthenticated state');
            setSession(null);
            setUser(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }
        if (mounted) {
          const nextSession = data?.session ?? null;
          const nextUser = nextSession?.user ?? null;
          authDebugLog('getSession resolved', {
            hasSession: Boolean(nextSession),
            userId: nextUser?.id || null,
            email: nextUser?.email || null,
            provider_token_present: false, // never log sensitive tokens
          });
          setSession(nextSession);
          setUser(nextUser);

          const { role: initialRole, source } = resolveRoleWithSource(nextUser);
          setRole(initialRole);
          setLoading(false);
          authDebugLog('role resolved from initial session', {
            role: initialRole,
            source,
          });

          // Attempt to refine role from profiles if still not found or using heuristic
          if (nextUser && (!initialRole || source === 'heuristic')) {
            const pRole = await loadRoleFromProfiles(nextUser);
            if (mounted && pRole && pRole !== initialRole) {
              setRole(pRole);
              authDebugLog('role refined via profiles', { role: pRole, previous: initialRole });
            }
          }
        }

        // Subscribe to auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          const currentUser = currentSession?.user ?? null;
          authDebugLog('onAuthStateChange', {
            event,
            hasSession: Boolean(currentSession),
            userId: currentUser?.id || null,
            email: currentUser?.email || null,
          });

          setSession(currentSession);
          setUser(currentUser);

          const { role: initialRole, source } = resolveRoleWithSource(currentUser);
          setRole(initialRole);
          authDebugLog('role resolved on auth event', { role: initialRole, source });

          if (currentUser && (!initialRole || source === 'heuristic')) {
            const pRole = await loadRoleFromProfiles(currentUser);
            if (pRole && pRole !== initialRole) {
              setRole(pRole);
              authDebugLog('role refined via profiles on auth event', { role: pRole, previous: initialRole });
            }
          }
        });

        return () => {
          listener?.subscription?.unsubscribe?.();
          authDebugLog('AuthProvider cleanup: unsubscribed from auth state changes');
        };
      } catch (e) {
        console.error('Auth initialization failed:', e);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    const cleanupPromise = initSession();

    return () => {
      mounted = false;
      void cleanupPromise;
      authDebugLog('AuthProvider unmount');
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

  // State change debug traces (lightweight; avoid spamming)
  React.useEffect(() => {
    authDebugLog('context state change', {
      loading,
      hasUser: Boolean(user),
      userId: user?.id || null,
      role,
      hasSession: Boolean(session),
    });
  }, [loading, user, role, session]);

  const value = React.useMemo(
    () => ({
      user,
      session,
      role,
      loading,
      isEmployee,
      isManager,
      isAdmin,
      hasRole,
      // PUBLIC_INTERFACE
      /** Signs the user out of Supabase and resets the context. */
      signOut: async () => {
        if (!supabase) return;
        try {
          authDebugLog('signOut called');
          await supabase.auth.signOut();
          authDebugLog('signOut complete');
        } catch (e) {
          console.error('Error signing out:', e);
        }
      },
    }),
    [user, session, role, loading, isEmployee, isManager, isAdmin, hasRole, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
