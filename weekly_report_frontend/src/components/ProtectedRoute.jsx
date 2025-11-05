import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAuthDisabled } from '../lib/featureFlags';

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute guards routes and redirects unauthenticated users to /login.
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
    // Minimal loading state
    return (
      <div className="card">
        <div className="helper">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
