import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAuthDisabled } from '../lib/featureFlags';

/**
 * PUBLIC_INTERFACE
 * Header with filters and user session actions.
 */
const Header = () => {
  const [week, setWeek] = React.useState('');
  const { user, role, signOut, team, teamPersisted } = useAuth();
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

        {/* Current Team display and switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="test-mode-pill"
            title={team ? `Current team: ${team.name || team.id}` : 'No team selected'}
            aria-label={team ? `Team ${team.name || team.id}` : 'No team selected'}
            style={{
              borderColor: team ? 'rgba(37, 99, 235, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              background: team ? 'rgba(37,99,235,0.08)' : 'rgba(239,68,68,0.08)',
              color: team ? '#1D4ED8' : '#B91C1C',
            }}
          >
            {team ? (team.name || team.id) : 'No Team'}
          </span>
          <Link to="/select-team" className="btn secondary" title="Switch team">
            Switch
          </Link>
        </div>

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
            {team && !teamPersisted && (
              <span
                className="test-mode-pill"
                title="Team not persisted"
                aria-label="Team not persisted"
                style={{ borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245,158,11,0.12)', color: '#92400E' }}
              >
                Local
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
