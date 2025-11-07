import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupabase, getSupabaseConfigStatus } from '../lib/supabaseClient';

import { getAppUrl } from '../lib/config';

/**
 * PUBLIC_INTERFACE
 * AuthCallback
 * Handles the OAuth callback flow from Supabase.
 *
 * Requirements implemented:
 * 1) Wait for a valid Supabase session using getSupabase().auth.getSession() and onAuthStateChange with a timeout (~12s).
 * 2) Do NOT redirect until a session exists.
 * 3) If timeout elapses, show a diagnostic panel with:
 *    - detected redirect target
 *    - current origin/app URL
 *    - Supabase config status (from getSupabaseConfigStatus)
 *    - a Retry button to re-check session
 * 4) Add a 'Continue' button that attempts navigation only when a session is present.
 * 5) Add console.debug logs gated to development mode.
 * 6) Ensure no ProtectedRoute redirection is triggered from this page while loading (route is unprotected).
 *
 * Behavior:
 * - Parses both search and hash params (as providers may place params in hash).
 * - Cleans URL to avoid leaving auth tokens in location hash.
 * - Waits for Supabase to establish a session (restored or via state change).
 * - Shows diagnostics on timeout with manual Retry/Continue actions.
 */
/* Control flow audit: Verified no statements after return; logs moved before returns where applicable.
   Also removed unused toast usage to resolve lint warnings about unused variables. */
const AuthCallback = () => {
  const supabase = getSupabase();
  const { isConfigured } = getSupabaseConfigStatus();
  const navigate = useNavigate();
  const location = useLocation();


  // Local UI state
  const [checking, setChecking] = React.useState(true);
  const [timedOut, setTimedOut] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [session, setSession] = React.useState(null);

  // Dev-only logger
  const dev = process.env.NODE_ENV !== 'production';
  const dlog = (...args) => {
    if (dev) {
      // eslint-disable-next-line no-console
      console.debug('[AuthCallback]', ...args);
    }
  };

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

  // Computed app URL for diagnostics
  const appUrl = getAppUrl();

  // Cleanup URL (remove tokens/hash), keep redirect param for clarity
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

  // Wait for session helper: tries immediate getSession, else subscribes to onAuthStateChange until timeout
  const waitForSession = React.useCallback(async (timeoutMs = 12000) => {
    if (!supabase) {
      setSession(null);
      return null;
    }
    try {
      dlog('Checking existing session via getSession()…');
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        dlog('getSession error:', sessionErr?.message || sessionErr);
      }
      const sess = data?.session || null;
      setSession(sess);
      if (sess) {
        dlog('Session exists immediately.');
        return sess;
      }
    } catch (e) {
      dlog('getSession threw:', e?.message || e);
    }

    // If not available yet, wait for onAuthStateChange or timeout
    dlog('No session yet. Subscribing to onAuthStateChange and waiting up to', timeoutMs, 'ms');
    return new Promise((resolve) => {
      let resolved = false;
      const toId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        dlog('Timeout waiting for session.');
        resolve(null);
      }, timeoutMs);

      const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
        dlog('onAuthStateChange event:', event, 'hasSession=', !!newSession);
        if (!resolved && newSession) {
          clearTimeout(toId);
          resolved = true;
          setSession(newSession);
          resolve(newSession);
        }
      });

      // Safety: cleanup after resolution to avoid leaks
      const cleanup = () => {
        try {
          listener?.subscription?.unsubscribe?.();
        } catch {
          // ignore
        }
      };
      // Ensure cleanup when promise resolves
      const origResolve = resolve;
      resolve = (v) => {
        cleanup();
        origResolve(v);
      };
    });
  }, [supabase, dlog]);

  // Main effect: clean URL, handle explicit OAuth errors, then wait for session
  const runCheck = React.useCallback(async () => {
    setChecking(true);
    setTimedOut(false);
    setError(null);

    if (!supabase) {
      dlog('Supabase client missing (not configured).');
      setChecking(false);
      setSession(null);
      setTimedOut(true);
      setError('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      return;
    }

    // Log OAuth errors if any were surfaced in parameters
    if (oauthError || oauthErrorDesc) {
      dlog('OAuth error detected in URL', { oauthError, oauthErrorDesc });
      // Friendly message for access_denied
      if (/access_denied|access-denied|denied|cancel/i.test(String(oauthError))) {
        setChecking(false);
        setSession(null);
        setTimedOut(true);
        setError('Access was denied or the sign-in was canceled. You can retry the login.');
        cleanupUrl();
        return;
      }
    } else {
      dlog('No OAuth error parameters present.');
    }

    cleanupUrl();

    // Wait for session (do NOT redirect until we have one)
    const sess = await waitForSession(12000);
    if (sess) {
      dlog('Session confirmed. Ready to continue.');
      setChecking(false);
      setTimedOut(false);
      setError(null);
      // Do NOT auto-redirect here. The Continue button will navigate.
      return;
    }

    // Timeout elapsed without a session
    setChecking(false);
    setTimedOut(true);
    setError(
      oauthError || oauthErrorDesc
        ? `We could not complete the sign-in: ${oauthErrorDesc || oauthError}.`
        : 'We could not confirm your session yet. You can retry or check configuration.'
    );
  }, [supabase, oauthError, oauthErrorDesc, waitForSession, cleanupUrl, dlog]);

  React.useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const onRetry = async () => {
    dlog('Retry clicked: re-checking session…');
    await runCheck();
  };

  const onContinue = () => {
    if (!session) {
      dlog('Continue clicked without session; ignoring.');
      return;
    }
    dlog('Continue clicked with session. Navigating to:', redirectParam);
    navigate(redirectParam, { replace: true });
  };

  const retryHref = `/login?redirect=${encodeURIComponent(redirectParam)}`;

  return (
    <div className="card" aria-live="polite">
      <div className="page-title">
        <h1>Completing sign-in…</h1>
        <span className="helper">Waiting for your session to be established</span>
      </div>

      {checking && (
        <div className="helper" aria-busy="true">Waiting for session…</div>
      )}

      {!checking && (
        <>
          {/* Diagnostic panel on timeout or config issues */}
          {(timedOut || !isConfigured || error) && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="page-title" style={{ marginBottom: 6 }}>
                <h1 style={{ fontSize: 16, margin: 0 }}>Diagnostics</h1>
              </div>
              {error && (
                <div className="helper" role="alert" style={{ color: 'var(--error)', marginBottom: 8 }}>
                  {error}
                </div>
              )}
              <div className="helper" style={{ display: 'grid', gap: 4 }}>
                <div><strong>Redirect target:</strong> <code>{redirectParam}</code></div>
                <div><strong>App URL:</strong> <code>{appUrl || '(not resolved)'}</code></div>
                <div><strong>Origin:</strong> <code>{(typeof window !== 'undefined' && window.location && window.location.origin) || '(unknown)'}</code></div>
                <div>
                  <strong>Supabase config:</strong>{' '}
                  {isConfigured ? 'Configured' : 'Missing (set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY)'}
                </div>
                <div>
                  <strong>Session present:</strong> {session ? 'Yes' : 'No'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={onRetry}>
                  Retry
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={onContinue}
                  disabled={!session}
                  title={session ? 'Continue to app' : 'Waiting for session'}
                >
                  Continue
                </button>
                <a href={retryHref} className="btn secondary">Back to Login</a>
              </div>
            </div>
          )}

          {/* If no timeout and we have a session, encourage user to continue */}
          {!timedOut && session && (
            <div className="helper" style={{ marginTop: 12 }}>
              Session confirmed. You can now continue to the app.
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn" onClick={onContinue}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* If no session yet but not checking (edge), show basic controls */}
          {!timedOut && !session && !checking && (
            <div className="helper" style={{ marginTop: 12 }}>
              Still waiting for sign-in to complete.
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn" onClick={onRetry}>
                  Retry
                </button>
                <a href={retryHref} className="btn secondary">Back to Login</a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuthCallback;
