import React from 'react';
import { getSupabase } from '../lib/supabaseClient';

/**
 * PUBLIC_INTERFACE
 * useAuth - React hook to access authentication state and actions.
 */
export const AuthContext = React.createContext({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return React.useContext(AuthContext);
}

/**
 * PUBLIC_INTERFACE
 * AuthProvider - Provides Supabase auth session and user state via context,
 * subscribes to auth changes, and exposes a signOut action.
 */
export function AuthProvider({ children }) {
  const supabase = getSupabase();
  const [session, setSession] = React.useState(null);
  const [user, setUser] = React.useState(null);
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
          setSession(data?.session ?? null);
          setUser(data?.session?.user ?? null);
          setLoading(false);
        }

        // Subscribe to auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
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

  const value = React.useMemo(
    () => ({
      user,
      session,
      loading,
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
    [user, session, loading, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
