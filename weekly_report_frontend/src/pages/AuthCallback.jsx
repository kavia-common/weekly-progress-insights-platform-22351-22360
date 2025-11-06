import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';
import { useToast } from '../components/ToastProvider';

/**
 * PUBLIC_INTERFACE
 * AuthCallback
 * This page handles the redirect back from Supabase OAuth providers (Google, Azure).
 * It checks for an active session and listens for auth state changes.
 * On success, it navigates the user to the landing route (or ?redirect= path).
 *
 * Behavior:
 * - Shows a loading state while checking/awaiting session.
 * - Displays an error message with a link to retry the login if session is missing after a timeout.
 * - Uses onAuthStateChange to capture session establishment after redirect.
 */
const AuthCallback = () => {
  const supabase = getSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [checking, setChecking] = React.useState(true);
  const [error, setError] = React.useState(null);

  const search = new URLSearchParams(location.search);
  const redirectTo = search.get('redirect') || '/reports/new';
  // Surface any OAuth error details if present
  const errorCode = search.get('error');
  const errorDesc = search.get('error_description');

  React.useEffect(() => {
    let unsubscribed = false;
    let timeoutId;

    async function finalize() {
      if (!supabase) {
        setError('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
        setChecking(false);
        return;
      }

      try {
        // Log any explicit OAuth error codes returned in the URL
        if (errorCode || errorDesc) {
          // eslint-disable-next-line no-console
          console.error('[AuthCallback] OAuth error:', { errorCode, errorDesc });
        }
        // First, try to read any already-restored session
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          // eslint-disable-next-line no-console
          console.error('Error reading session on callback:', sessionError);
        } else {
          // eslint-disable-next-line no-console
          console.debug('[AuthCallback] getSession result:', !!data?.session);
        }
        const session = data?.session || null;
        if (session) {
          // Session is immediately available; proceed
          addToast('success', 'Signed in successfully.');
          // eslint-disable-next-line no-console
          console.debug('[AuthCallback] Navigating to redirect:', redirectTo);
          navigate(redirectTo, { replace: true });
          return;
        }

        // If no session yet, subscribe to auth changes (provider may set it shortly)
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (unsubscribed) return;
          // eslint-disable-next-line no-console
          console.debug('[AuthCallback] onAuthStateChange:', event, 'hasSession=', !!newSession);
          if (newSession) {
            addToast('success', 'Signed in successfully.');
            // eslint-disable-next-line no-console
            console.debug('[AuthCallback] Navigating to redirect after state change:', redirectTo);
            navigate(redirectTo, { replace: true });
          }
        });

        // Safety timeout in case session never arrives
        timeoutId = setTimeout(() => {
          if (unsubscribed) return;
          setChecking(false);
          setError(
            'We could not complete the sign-in. Please try again or contact support.'
          );
        }, 8000);

        // Cleanup
        return () => {
          listener?.subscription?.unsubscribe?.();
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('OAuth callback finalization failed:', e);
        setError(e?.message || 'Unexpected error completing sign-in.');
        setChecking(false);
      }
    }

    finalize();

    return () => {
      unsubscribed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [supabase, navigate, redirectTo, addToast]);

  return (
    <div className="card" aria-live="polite">
      <div className="page-title">
        <h1>Completing sign-in…</h1>
        <span className="helper">Please wait while we finalize your session</span>
      </div>

      {checking && (
        <div className="helper">Loading…</div>
      )}

      {!checking && error && (
        <>
          <div className="helper" style={{ color: 'var(--error)', marginBottom: 8 }} role="alert">
            {error}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/login" className="btn secondary">Back to Login</a>
            <a href={redirectTo} className="btn secondary">Go to App</a>
          </div>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
