import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAuthDisabled } from '../lib/featureFlags';

/**
 * PUBLIC_INTERFACE
 * ManagerRoute - Guards children so only users with role "manager" or "admin" can access.
 * Falls back to /login if not authenticated, or /unauthorized if authenticated but insufficient role.
 */
export function ManagerRoute({ children }) {
  const { user, loading, role, isManager, isAdmin } = useAuth();
  const location = useLocation();

  if (isAuthDisabled()) return children;

  if (loading) {
    return (
      <div className="card">
        <div className="helper" aria-busy="true">Loading…</div>
      </div>
    );
  }

  if (!user) {
    const intended = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(intended)}`} replace />;
  }

  if (!(isManager() || isAdmin())) {
    return <Navigate to={`/unauthorized?role=${encodeURIComponent(role || '')}`} replace state={{ from: location }} />;
  }

  return children;
}

/**
 * PUBLIC_INTERFACE
 * AdminRoute - Guards children so only users with role "admin" can access.
 * Falls back to /login if not authenticated, or /unauthorized if authenticated but insufficient role.
 */
export function AdminRoute({ children }) {
  const { user, loading, role, isAdmin } = useAuth();
  const location = useLocation();

  if (isAuthDisabled()) return children;

  if (loading) {
    return (
      <div className="card">
        <div className="helper" aria-busy="true">Loading…</div>
      </div>
    );
  }

  if (!user) {
    const intended = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(intended)}`} replace />;
  }

  if (!isAdmin()) {
    return <Navigate to={`/unauthorized?role=${encodeURIComponent(role || '')}`} replace state={{ from: location }} />;
  }

  return children;
}
