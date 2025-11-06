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
 * - Parses both search and hash params (Supabase may return tokens in hash).
 * - Shows a loading state while checking/awaiting session.
 * - Subscribes to onAuthStateChange and resolves once session exists or after a timeout.
 * - If URL contains error=access_denied or other errors, shows a friendly message with retry.
 * - Cleans up URL hash and params once processed.
 */
const AuthCallback = () => {
  const supabase = getSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [checking, setChecking] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Utility: parse hash as query-string
  const parseHashParams = React.useCallback((hash) => {
    const h = (hash || '').startsWith('#') ? hash.slice(1) : (hash || '');
    return new URLSearchParams(h);
  }, []);

  // Extract parameters from search and hash
  const search = new URLSearchParams(location.search || '');
  const hashParams = parseHashParams(location.hash || '');

  // Prefer explicit redirect in search, else in hash, else default
  const redirectParam =
    search.get('redirect') ||
    hashParams.get('redirect') ||
    '/reports/new';

  // OAuth error detection from both places
  const oauthError =
    search.get('error') ||
    hashParams.get('error') ||
    null;
  const oauthErrorDesc =
    search.get('error_description') ||
    hashParams.get('error_description') ||
    null;

  // Telemetry helper
  const log = (level, ...args) => {
    // eslint-disable-next-line no-console
    (console[level] || console.log)('[AuthCallback]', ...args);
  };

  // Cleanup URL (remove tokens/hash)
  const cleanupUrl = React.useCallback(() => {
    try {
      const base = '/auth/callback';
      const params = new URLSearchParams();
      if (redirectParam) params.set('redirect', redirectParam);
      const newUrl = `${base}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    } catch {
      // no-op if history API fails
    }
  }, [redirectParam]);

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
        // Log mode and any explicit OAuth error codes returned in the URL
        if (oauthError || oauthErrorDesc) {
          log('error', 'OAuth error detected in URL', { oauthError, oauthErrorDesc });
        } else {
          log('debug', 'No OAuth error parameters present.');
        }

        // Handle explicit "access_denied" or variations immediately with friendly UI
        if (oauthError && /access_denied|access-denied|denied|cancel/i.test(oauthError)) {
          setChecking(false);
          setError('Access was denied or the sign-in was canceled. You can retry the login.');
          cleanupUrl();
          return;
        }

        // First, try to read any already-restored session
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          log('error', 'Error reading session on callback:', sessionError);
        } else {
          log('debug', 'getSession result hasSession=', !!data?.session);
        }
        const session = data?.session || null;

        if (session) {
          // Session is immediately available; proceed
          addToast('success', 'Signed in successfully.');
          log('debug', 'Navigating to redirect (immediate):', redirectParam);
          cleanupUrl();
          navigate(redirectParam, { replace: true });
          return;
        }

        // If no session yet, subscribe to auth changes (provider may set it shortly)
        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (unsubscribed) return;
          log('debug', 'onAuthStateChange:', event, 'hasSession=', !!newSession);
          if (newSession) {
            addToast('success', 'Signed in successfully.');
            log('debug', 'Navigating to redirect after state change:', redirectParam);
            cleanupUrl();
            navigate(redirectParam, { replace: true });
          }
        });

        // Safety timeout in case session never arrives
        timeoutId = setTimeout(() => {
          if (unsubscribed) return;
          setChecking(false);
          setError(
            oauthError || oauthErrorDesc
              ? `We could not complete the sign-in: ${oauthErrorDesc || oauthError}. Please try again.`
              : 'We could not complete the sign-in. Please try again or contact support.'
          );
          cleanupUrl();
        }, 9000); // 9s timeout window

        // Cleanup function for the effect
        return () => {
          listener?.subscription?.unsubscribe?.();
        };
      } catch (e) {
        log('error', 'OAuth callback finalization failed:', e);
        setError(e?.message || 'Unexpected error completing sign-in.');
        setChecking(false);
        cleanupUrl();
      }
    }

    // Clean out hash immediately to avoid leaving tokens in URL
    cleanupUrl();
    finalize();

    return () => {
      unsubscribed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [supabase, navigate, redirectParam, addToast, oauthError, oauthErrorDesc, cleanupUrl]);

  const retryHref = `/login?redirect=${encodeURIComponent(redirectParam)}`;

  return (
    <div className="card" aria-live="polite">
      <div className="page-title">
        <h1>Completing sign-in…</h1>
        <span className="helper">Please wait while we finalize your session</span>
      </div>

      {checking && (
        <div className="helper" aria-busy="true">Loading…</div>
      )}

      {!checking && error && (
        <>
          <div className="helper" style={{ color: 'var(--error)', marginBottom: 8 }} role="alert">
            {error}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={retryHref} className="btn">Retry Sign-in</a>
            <a href="/login" className="btn secondary">Back to Login</a>
            <a href={redirectParam} className="btn secondary">Go to App</a>
          </div>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
