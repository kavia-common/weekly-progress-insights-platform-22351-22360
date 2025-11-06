import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * Sidebar navigation for primary sections of the app.
 */
const Sidebar = () => {
  const { isManager, isAdmin, team } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">WR</div>
        <div className="brand-title">Weekly Report Platform</div>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="helper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Team</span>
          <Link to="/select-team" className="btn secondary" style={{ padding: '6px 8px' }}>Change</Link>
        </div>
        <div style={{ marginTop: 6, fontWeight: 600 }}>
          {team ? (team.name || team.id) : <span style={{ color: 'var(--muted)' }}>No team selected</span>}
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/reports/new">
          <span>📝</span>
          <span>New Report</span>
        </NavLink>
        <NavLink to="/reports/history">
          <span>📚</span>
          <span>History</span>
        </NavLink>

        {(isManager() || isAdmin()) && (
          <>
            <NavLink to="/team">
              <span>📊</span>
              <span>Team Dashboard</span>
            </NavLink>
            <NavLink to="/manager/reports">
              <span>🗂️</span>
              <span>Team Reports</span>
            </NavLink>
          </>
        )}

        {isAdmin() && (
          <NavLink to="/admin">
            <span>⚙️</span>
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
