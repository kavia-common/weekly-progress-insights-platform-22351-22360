import React from 'react';
import { useAuth } from '../context/AuthContext';
import { isAuthDisabled } from '../lib/featureFlags';

/**
 * PUBLIC_INTERFACE
 * Header with filters and user session actions.
 */
const Header = () => {
  const [week, setWeek] = React.useState('');
  const [team, setTeam] = React.useState('');
  const { user, role, signOut } = useAuth();
  const authDisabled = isAuthDisabled();

  return (
    <header className="header">
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h1>Weekly Progress</h1>
        <span className="helper">Ocean Professional</span>
        {authDisabled && (
          <span
            className="test-mode-pill"
            aria-label="Test Mode active"
            title="Authentication is disabled for local testing"
          >
            Test Mode
          </span>
        )}
      </div>
      <div className="filters">
        <input
          type="week"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          aria-label="Select week"
        />
        <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Select team">
          <option value="">All Teams</option>
          <option value="alpha">Alpha</option>
          <option value="beta">Beta</option>
          <option value="gamma">Gamma</option>
        </select>

        {/* User info and sign out */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <span className="helper" title={user.id}>
              {user.email}
            </span>
            {role && (
              <span
                className="test-mode-pill"
                title={`Role: ${role}`}
                aria-label={`Current role ${role}`}
                style={{ borderColor: 'rgba(37, 99, 235, 0.3)', background: 'rgba(37,99,235,0.08)', color: '#1D4ED8' }}
              >
                {role}
              </span>
            )}
            {!authDisabled && (
              <button type="button" className="btn secondary" onClick={signOut}>
                Sign Out
              </button>
            )}
          </div>
        ) : (
          <span className="helper" style={{ marginLeft: 8 }}>
            {authDisabled ? 'Auth bypass enabled' : 'Not signed in'}
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
