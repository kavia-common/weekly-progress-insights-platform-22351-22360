import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getTeams, createTeam } from '../services/teamService';
import ConfigWarning from '../components/ConfigWarning';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';

// PUBLIC_INTERFACE
/**
 * TeamSelector
 * UI for users who don't have a team yet. Supports:
 * - Selecting from existing teams
 * - Creating a new team (backend only; local-only placeholder if backend not configured)
 * - Graceful guidance when backend is not configured
 * 
 * After selecting/creating, it calls setTeamSelection from AuthContext.
 * Redirect target:
 * - Prefer location.state.from (the route that required a team)
 * - Fallback to /team
 */
const TeamSelector = () => {
  const { addToast } = useToast();
  const { setTeamSelection, teamPersisted } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = React.useState(true);
  const [teams, setTeams] = React.useState([]);
  const [apiAvailable, setApiAvailable] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [newTeamName, setNewTeamName] = React.useState('');

  const redirectTo = location.state?.from?.pathname || '/team';

  const loadTeams = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeams();
      setTeams(Array.isArray(res?.teams) ? res.teams : []);
      setApiAvailable(Boolean(res?.available));
    } catch (e) {
      setTeams([]);
      setError(e?.message || 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const onSelectTeam = async (t) => {
    try {
      const result = await setTeamSelection(t);
      if (result?.persisted) {
        addToast('success', `Team set to "${t.name || t.id}".`);
      } else {
        addToast('info', `Team set to "${t.name || t.id}" (local only). Configure backend to persist.`);
      }
      navigate(redirectTo, { replace: true });
    } catch (e) {
      addToast('error', e?.message || 'Failed to set team.');
    }
  };

  const onCreateTeam = async (e) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    try {
      const res = await createTeam(name);
      const created = res?.team;
      if (created?.id) {
        if (!res?.available) {
          addToast('info', 'Team created locally. Configure backend to persist.');
        } else {
          addToast('success', 'Team created.');
        }
        setNewTeamName('');
        // Add to list and select it
        setTeams((prev) => [{ id: created.id, name: created.name }, ...prev]);
        await onSelectTeam(created);
      }
    } catch (err) {
      addToast('error', err?.message || 'Failed to create team.');
    }
  };

  return (
    <div className="card" aria-live="polite">
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Select Your Team</h1>
          <span className="helper">Choose an existing team or create a new one</span>
        </div>
        <Link to="/reports/new" className="btn secondary">Skip to Reports</Link>
      </div>

      {!apiAvailable && (
        <div className="test-mode-banner">
          <ConfigWarning message="Backend API not configured. Selecting/creating a team will be remembered locally for this browser only. Set REACT_APP_API_BASE to persist team assignments." />
        </div>
      )}

      {teamPersisted === false && (
        <div className="test-mode-banner">
          <ConfigWarning message="Current team selection is not persisted to the server and may be lost. Configure backend to persist." />
        </div>
      )}

      {error && (
        <div className="helper" role="alert" style={{ color: 'var(--error)', marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="card">
          <div className="page-title" style={{ marginBottom: 8 }}>
            <h1 style={{ fontSize: 16, margin: 0 }}>Available Teams</h1>
          </div>
          {loading ? (
            <div className="helper" aria-busy="true">Loading teams…</div>
          ) : teams.length === 0 ? (
            <div className="helper">No teams found.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="btn secondary"
                  onClick={() => onSelectTeam(t)}
                  title={`Switch to ${t.name || t.id}`}
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>👥 {t.name || t.id}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{t.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="page-title" style={{ marginBottom: 8 }}>
            <h1 style={{ fontSize: 16, margin: 0 }}>Create a Team</h1>
          </div>
          {!apiAvailable && (
            <div className="helper" style={{ marginBottom: 8 }}>
              This will create a local-only team. Configure backend to persist teams.
            </div>
          )}
          <form onSubmit={onCreateTeam} className="form-grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
            <div className="form-group">
              <label htmlFor="teamName">Team Name</label>
              <input
                id="teamName"
                type="text"
                className="textarea"
                style={{ minHeight: 'auto' }}
                placeholder="e.g., Platform, Growth, Customer Success"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
              />
            </div>
            <div>
              <button type="submit" className="btn">Create</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeamSelector;
