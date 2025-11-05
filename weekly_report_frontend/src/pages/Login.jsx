import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupabase, getSupabaseConfigStatus } from '../lib/supabaseClient';
import ConfigWarning from '../components/ConfigWarning';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * Login page supports email magic link authentication via Supabase.
 * It also handles redirect after successful authentication.
 */
const Login = () => {
  const supabase = getSupabase();
  const { isConfigured } = getSupabaseConfigStatus();
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState(null);
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/reports/new';

  React.useEffect(() => {
    // If already authenticated, redirect to origin path
    if (user) {
      navigate(fromPath, { replace: true });
    }
  }, [user, fromPath, navigate]);

  const siteUrl =
    process.env.REACT_APP_FRONTEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const onSubmit = async (e) => {
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
          emailRedirectTo: siteUrl, // Redirect back to app root; session will be resumed automatically
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
        <span className="helper">Use your work email to receive a magic link</span>
      </div>

      {!isConfigured && (
        <ConfigWarning message="Supabase configuration missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY to enable authentication." />
      )}

      <form onSubmit={onSubmit} className="form-grid" style={{ maxWidth: 420 }}>
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
    </div>
  );
};

export default Login;
