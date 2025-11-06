import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupabase, getSupabaseConfigStatus } from '../lib/supabaseClient';
import ConfigWarning from '../components/ConfigWarning';
import { useAuth } from '../context/AuthContext';
import { isAuthDisabled } from '../lib/featureFlags';
import { useToast } from '../components/ToastProvider';
import { getAppUrl } from '../lib/config';

/**
 * PUBLIC_INTERFACE
 * Login page supports OAuth sign-in with Google and Azure via Supabase.
 * In Test Mode (REACT_APP_DISABLE_AUTH=true), shows email magic link authentication for local testing.
 * It also handles redirect after successful authentication.
 */
const Login = () => {
  const supabase = getSupabase();
  const { isConfigured } = getSupabaseConfigStatus();
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loadingProvider, setLoadingProvider] = React.useState(null); // 'google' | 'azure' | null
  const { user } = useAuth();
  const { addToast } = useToast();

  const navigate = useNavigate();
  const location = useLocation();
  // Determine redirect target: prefer state.from, then ?redirect, then default
  const search = new URLSearchParams(location.search);
  const redirectTarget =
    location.state?.from?.pathname ||
    search.get('redirect') ||
    '/reports/new';

  const authDisabled = isAuthDisabled();

  React.useEffect(() => {
    // If already authenticated, redirect to origin path
    if (user) {
      // eslint-disable-next-line no-console
      console.debug('[Login] User already authenticated. Redirecting to:', redirectTarget);
      navigate(redirectTarget, { replace: true });
    }
  }, [user, redirectTarget, navigate]);

  // Resolve base app URL for redirects. Prefers env var, falls back to window origin.
  const appUrl = getAppUrl();

  // Include the desired redirect target so /auth/callback can navigate properly post-auth
  // Construct redirectTo ensuring correct callback host and preserve target via ?redirect
  const oauthRedirectToBase = `${appUrl}/auth/callback`;
  const oauthRedirectTo = `${oauthRedirectToBase}?redirect=${encodeURIComponent(redirectTarget)}`;

  const signInWithProvider = async (provider) => {
    setError(null);
    setStatus(null);
    setLoadingProvider(provider);
    if (!supabase) {
      setLoadingProvider(null);
      setError('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      return;
    }
    try {
      // eslint-disable-next-line no-console
      console.debug('[Login] Starting OAuth sign-in with provider:', provider, ' redirectTo:', oauthRedirectTo);
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // As requested: const appUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
          // redirectTo: `${appUrl}/auth/callback`
          // We also preserve a redirect param for post-login UX.
          redirectTo: oauthRedirectTo,
        },
      });
      if (signInError) throw signInError;
      // Redirect will occur; best-effort message
      addToast('info', 'Redirecting to provider…');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Login] OAuth sign-in error:', err);
      setError(err?.message || 'Failed to start OAuth sign-in.');
      setLoadingProvider(null);
    }
  };

  const onSubmitMagicLink = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('Sending magic link...');
    if (!supabase) {
      setStatus(null);
      setError('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      return;
    }
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Redirect back to app; session will be resumed automatically.
          // Using getAppUrl() to stay consistent with OAuth redirect base.
          emailRedirectTo: appUrl,
        },
      });

      if (signInError) throw signInError;

      setStatus('Magic link sent! Please check your email to continue.');
      setEmail('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError(err?.message || 'Failed to send magic link.');
      setStatus(null);
    }
  };

  return (
    <div className="card" aria-live="polite">
      <div className="page-title">
        <h1>Sign In</h1>
        <span className="helper">
          {authDisabled ? 'Test Mode: Use a magic link for local testing' : 'Choose your provider to continue'}
        </span>
      </div>

      {!isConfigured && (
        <ConfigWarning message="Supabase configuration missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY to enable authentication." />
      )}

      {!authDisabled && (
        <>
          <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
            <button
              type="button"
              className="btn"
              onClick={() => signInWithProvider('google')}
              disabled={Boolean(loadingProvider)}
              aria-busy={loadingProvider === 'google' ? 'true' : 'false'}
              title="Sign in with Google"
            >
              {loadingProvider === 'google' ? 'Redirecting to Google…' : 'Continue with Google'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => signInWithProvider('azure')}
              disabled={Boolean(loadingProvider)}
              aria-busy={loadingProvider === 'azure' ? 'true' : 'false'}
              title="Sign in with Microsoft (Azure AD)"
            >
              {loadingProvider === 'azure' ? 'Redirecting to Microsoft…' : 'Continue with Microsoft'}
            </button>
          </div>
          {error && (
            <div className="helper" style={{ color: 'var(--error)', marginTop: 8 }} role="alert">
              {error}
            </div>
          )}
        </>
      )}

      {authDisabled && (
        <form onSubmit={onSubmitMagicLink} className="form-grid" style={{ maxWidth: 420 }}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="textarea"
              style={{ minHeight: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" type="submit" disabled={!email}>
              Send Magic Link
            </button>
            {status && <span className="helper">{status}</span>}
            {error && <span className="helper" style={{ color: 'var(--error)' }}>{error}</span>}
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;
