import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * Sidebar navigation for primary sections of the app.
 */
const Sidebar = () => {
  const { isManager, isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">WR</div>
        <div className="brand-title">Weekly Report Platform</div>
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
