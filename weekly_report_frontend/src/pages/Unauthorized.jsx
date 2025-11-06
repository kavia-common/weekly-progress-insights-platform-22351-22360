import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * Unauthorized - Friendly page shown when user lacks role permissions for a route.
 * Offers guidance and navigation options back to safe pages.
 */
const Unauthorized = () => {
  const location = useLocation();
  const { role } = useAuth();

  const from = location.state?.from?.pathname || '/';
  const search = new URLSearchParams(location.search || '');
  const attemptedRole = search.get('role') || role || 'unknown';

  return (
    <div className="card" aria-live="polite">
      <div className="page-title">
        <h1>Access Restricted</h1>
        <span className="helper">You don’t have permission to view this page.</span>
      </div>

      <div className="helper" style={{ marginBottom: 12 }}>
        Your current role is: <strong>{attemptedRole}</strong>. If you believe this is a mistake, please contact an administrator to request access.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to="/reports/new" className="btn">Go to Employee Dashboard</Link>
        <Link to="/team" className="btn secondary">Team Dashboard</Link>
        <Link to="/admin" className="btn secondary">Admin Dashboard</Link>
        <Link to={from} className="btn secondary" title="Return to previous page">Back</Link>
      </div>
    </div>
  );
};

export default Unauthorized;
