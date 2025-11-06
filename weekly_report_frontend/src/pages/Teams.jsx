import React from 'react';
import { useToast } from '../components/ToastProvider';
import { getTeams, summarizeTeam } from '../services/teamService';
import { getApiBase } from '../services/apiClient';
import ConfigWarning from '../components/ConfigWarning';

// PUBLIC_INTERFACE
/**
 * Teams - Manager/Admin view to list teams and trigger a summarization action per team.
 * Uses:
 *  - GET /api/teams
 *  - POST /api/teams/:teamId/summarize
 * Shows loading and error states and success toasts.
 */
const Teams = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [teams, setTeams] = React.useState([]);
  const [summarizing, setSummarizing] = React.useState({}); // teamId -> boolean
  const [summaries, setSummaries] = React.useState({}); // teamId -> string

  const hasApi = Boolean(getApiBase());

  const loadTeams = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeams();
      setTeams(res.teams || []);
      if (!res.available) {
        addToast('info', res.message || 'Backend not configured; showing sample teams.');
      } else {
        addToast('success', `Loaded ${res.teams?.length || 0} team(s).`);
      }
    } catch (e) {
      setError(e?.message || 'Failed to load teams.');
      addToast('error', e?.message || 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const onSummarize = async (teamId) => {
    setSummarizing((prev) => ({ ...prev, [teamId]: true }));
    setError(null);
    try {
      const { summary } = await summarizeTeam(teamId);
      setSummaries((prev) => ({ ...prev, [teamId]: summary || '' }));
      addToast('success', 'Summary generated.', { id: `ok:sum:${teamId}` });
    } catch (e) {
      addToast('error', e?.message || 'Summarize failed', { id: `err:sum:${teamId}` });
      setError(e?.message || 'Summarize failed.');
    } finally {
      setSummarizing((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  return (
    <div>
      <div className="page-title">
        <h1>Teams</h1>
        <span className="helper">Manager/Admin</span>
      </div>

      {!hasApi && (
        <div className="test-mode-banner" style={{ marginBottom: 12 }}>
          <ConfigWarning message="Backend API base not configured. Set REACT_APP_API_BASE to enable live team summarization. Showing sample teams only." />
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="helper" aria-busy="true">Loading…</div>
        ) : error ? (
          <div className="helper" role="alert" style={{ color: 'var(--error)' }}>
            {error}
          </div>
        ) : teams.length === 0 ? (
          <div className="helper">No teams found.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {teams.map((t) => (
              <div
                key={t.id}
                className="card"
                style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div className="helper" style={{ fontSize: 12 }}>ID: {t.id}</div>
                </div>
                <div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => onSummarize(t.id)}
                    disabled={Boolean(summarizing[t.id]) || !hasApi}
                  >
                    {summarizing[t.id] ? 'Summarizing…' : 'Summarize'}
                  </button>
                </div>
                {summaries[t.id] && (
                  <div className="helper" style={{ gridColumn: '1 / -1', whiteSpace: 'pre-wrap', marginTop: 8 }}>
                    {summaries[t.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
