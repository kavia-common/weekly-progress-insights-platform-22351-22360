import React from 'react';
import { getSupabase } from '../lib/supabaseClient';

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
 * AuthProvider - Provides Supabase auth session, user state, and role via context,
 * subscribes to auth changes, and exposes a signOut action.
 */
export function AuthProvider({ children }) {
  const supabase = getSupabase();
  const [session, setSession] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Initialize session on mount
  React.useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (!supabase) {
          // Supabase not configured - remain unauthenticated but don't crash
          if (mounted) {
            setSession(null);
            setUser(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Error getting session:', error);
        }
        if (mounted) {
          const nextSession = data?.session ?? null;
          const nextUser = nextSession?.user ?? null;
          setSession(nextSession);
          setUser(nextUser);
          setRole(deriveRoleFromUser(nextUser));
          setLoading(false);
        }

        // Subscribe to auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
          const currentUser = currentSession?.user ?? null;
          setSession(currentSession);
          setUser(currentUser);
          setRole(deriveRoleFromUser(currentUser));
        });

        return () => {
          listener?.subscription?.unsubscribe?.();
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth initialization failed:', e);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    const cleanupPromise = initSession();

    return () => {
      mounted = false;
      // handle potential async cleanup
      void cleanupPromise;
    };
  }, [supabase]);

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
          await supabase.auth.signOut();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error signing out:', e);
        }
      },
    }),
    [user, session, role, loading, isEmployee, isManager, isAdmin, hasRole, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
