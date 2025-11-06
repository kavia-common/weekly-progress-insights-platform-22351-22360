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
  const { user, loading } = useAuth();
  const location = useLocation();

  // If auth checks are disabled (test mode), allow rendering immediately
  if (isAuthDisabled()) {
    return children;
  }

  if (loading) {
    // Visible loading state while the auth session is resolving
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] Waiting for auth session to resolve…');
    return (
      <div className="card">
        <div className="helper" aria-busy="true">Loading…</div>
      </div>
    );
  }

  if (!user) {
    const intended = `${location.pathname}${location.search || ''}`;
    const redirectQs = encodeURIComponent(intended);
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] No user. Redirecting to login with redirect=', intended);
    return <Navigate to={`/login?redirect=${redirectQs}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
