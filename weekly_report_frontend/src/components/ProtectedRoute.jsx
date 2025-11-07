import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAuthDisabled } from '../lib/featureFlags';

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute guards routes and redirects unauthenticated users to /login?redirect=<path>.
 * When REACT_APP_DISABLE_AUTH is enabled, this component will allow access without requiring auth.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  const authDebugLog = React.useCallback((...args) => {
    try {
      const forced = typeof window !== 'undefined' && localStorage.getItem('auth_debug') === 'true';
      const dev = process.env.NODE_ENV !== 'production';
      if (dev || forced) {
        // eslint-disable-next-line no-console
        console.debug('[AUTH][DEBUG]', ...args);
      }
    } catch {
      // ignore
    }
  }, []);

  const intended = `${location.pathname}${location.search || ''}`;

  authDebugLog('ProtectedRoute render', {
    path: location.pathname,
    search: location.search || '',
    loading,
    hasUser: Boolean(user),
    userId: user?.id || null,
    role: role || null,
    authDisabled: isAuthDisabled(),
  });

  // If auth checks are disabled (test mode), allow rendering immediately
  if (isAuthDisabled()) {
    authDebugLog('Auth disabled: allowing access to route', { path: location.pathname });
    return children;
  }

  if (loading) {
    authDebugLog('Auth loading: showing loading state');
    return (
      <div className="card">
        <div className="helper" aria-busy="true">Loading…</div>
      </div>
    );
  }

  if (!user) {
    const redirectQs = encodeURIComponent(intended);
    authDebugLog('No user: redirecting to /login with redirect param', { intended });
    return <Navigate to={`/login?redirect=${redirectQs}`} replace />;
  }

  authDebugLog('User present: allowing access', {
    userId: user?.id || null,
    role: role || null,
  });

  return children;
};

export default ProtectedRoute;
