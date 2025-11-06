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
 * - Parses both search and hash params (Supabase may return tokens in hash or code in query).
 * - If "code" (PKCE Authorization Code) is present, calls supabase.auth.exchangeCodeForSession(window.location.href).
 * - If hash contains access_token/refresh_token (implicit flow), calls supabase.auth.setSession to persist.
 * - Only cleans up the URL after processing tokens and establishing a session (or after a final error).
 * - Awaits supabase.auth.getSession() and subscribes to onAuthStateChange with detailed logging.
 * - Shows a loading state while checking/awaiting session and exposes friendly error surfaces on failure.
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

  // Helpful logger
  const log = (level, ...args) => {
    // eslint-disable-next-line no-console
    (console[level] || console.log)('[AuthCallback]', ...args);
  };

  // Cleanup URL (remove tokens/hash) AFTER we've processed them
  const cleanupUrl = React.useCallback(() => {
    try {
      const base = '/auth/callback';
      const params = new URLSearchParams();
      if (redirectParam) params.set('redirect', redirectParam);
      const newUrl = `${base}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
      log('debug', 'Cleaned up URL to', newUrl);
    } catch {
      // no-op if history API fails
    }
  }, [redirectParam]);

  // Parse implicit access token/refresh token from hash (if present)
  const parseImplicitTokens = React.useCallback(() => {
    const access_token = hashParams.get('access_token') || null;
    const refresh_token = hashParams.get('refresh_token') || null;
    const token_type = hashParams.get('token_type') || null;
    const expires_in = hashParams.get('expires_in') || null;
    return { access_token, refresh_token, token_type, expires_in };
  }, [hashParams]);

  React.useEffect(() => {
    let unsubscribed = false;
    let timeoutId;

    async function finalize() {
      if (!supabase) {
        setError('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
        setChecking(false);
        return;
      }

      // 1) Log any explicit OAuth error codes returned in the URL
      if (oauthError || oauthErrorDesc) {
        log('error', 'OAuth error detected in URL', { oauthError, oauthErrorDesc });
      } else {
        log('debug', 'No OAuth error parameters present.');
      }

      // Handle explicit "access_denied" or known cancellation immediately
      if (oauthError && /access_denied|access-denied|denied|cancel/i.test(oauthError)) {
        setChecking(false);
        setError('Access was denied or the sign-in was canceled. You can retry the login.');
        cleanupUrl();
        return;
      }

      try {
        // 2) Handle Authorization Code Flow (PKCE): if "code" in query, exchange for session
        const code = search.get('code');
        const hasCode = typeof code === 'string' && code.length > 0;
        if (hasCode) {
          log('debug', 'Detected authorization code in query. Exchanging for session…');
          try {
            // Many Supabase v2 examples use window.location.href for exchange
            const { data: exchData, error: exchErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (exchErr) {
              log('error', 'exchangeCodeForSession error:', exchErr);
              // Surface a user-visible error but continue to attempt getSession in case it still succeeded
              setError(exchErr.message || 'Failed to complete sign-in (code exchange error).');
            } else {
              log('debug', 'exchangeCodeForSession succeeded. hasSession=', !!exchData?.session);
            }
          } catch (ex) {
            log('error', 'Exception during exchangeCodeForSession:', ex);
            setError(ex?.message || 'Failed to complete sign-in (exchange exception).');
          }
        } else {
          // 3) Handle implicit flow (tokens in hash) if present
          const { access_token, refresh_token } = parseImplicitTokens();
          if (access_token && refresh_token) {
            log('debug', 'Detected implicit flow tokens in hash. Setting session…');
            try {
              const { data: setData, error: setErr } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (setErr) {
                log('error', 'setSession error:', setErr);
                setError(setErr.message || 'Failed to set session from tokens.');
              } else {
                log('debug', 'setSession succeeded. hasSession=', !!setData?.session);
              }
            } catch (setEx) {
              log('error', 'Exception during setSession:', setEx);
              setError(setEx?.message || 'Failed to set session from tokens.');
            }
          } else {
            log('debug', 'No code in query and no implicit tokens in hash. Will check existing session.');
          }
        }

        // 4) Try to read any already-restored session
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          log('error', 'Error reading session on callback:', sessionError);
        } else {
          log('debug', 'getSession result hasSession=', !!data?.session);
        }
        const session = data?.session || null;

        if (session) {
          // Session is available; proceed
          addToast('success', 'Signed in successfully.');
          log('debug', 'Navigating to redirect (immediate):', redirectParam);
          cleanupUrl();
          if (!unsubscribed) {
            navigate(redirectParam, { replace: true });
          }
          return;
        }

        // 5) If no session yet, subscribe to auth changes (provider may set it shortly)
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
        }, 12000); // 12s timeout window

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

    // Note: DO NOT clean the URL before processing tokens/code. We only clean after success or final error.
    finalize();

    return () => {
      unsubscribed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [supabase, navigate, redirectParam, addToast, oauthError, oauthErrorDesc, cleanupUrl, search, parseImplicitTokens]);

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
