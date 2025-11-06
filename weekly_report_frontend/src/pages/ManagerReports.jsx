import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSupabase } from '../lib/supabaseClient';
import { isAuthDisabled } from '../lib/featureFlags';
import { useToast } from '../components/ToastProvider';
import ConfigWarning from '../components/ConfigWarning';
import { apiGet, apiPost, getApiBase } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { showApiError, showApiSuccess } from '../utils/toast';

/**
 * PUBLIC_INTERFACE
 * ManagerReports
 * Lists team reports with simple filters and provides an "AI Summary" action.
 * - If REACT_APP_API_BASE/REACT_APP_BACKEND_URL is present, uses backend endpoints:
 *   - GET /manager/reports?team&from&to&limit
 *   - POST /manager/ai/summary with { team, from, to }
 * - Otherwise, falls back to Supabase fetch from weekly_reports (may be constrained by RLS),
 *   and shows inline guidance if access is blocked or insufficient.
 * Redirects to TeamSelector if no team is selected.
 */
const ManagerReports = () => {
  const { team, teamLoading } = useAuth();
  const location = useLocation();

  const supabase = getSupabase();
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [summary, setSummary] = React.useState(null);

  // Filters (teamFilter defaults to selected team once loaded)
  const [teamFilter, setTeamFilter] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [limit, setLimit] = React.useState(50);

  const hasApi = Boolean(getApiBase());
  const authDisabled = isAuthDisabled();

  // Initialize default date range to current month
  React.useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const iso = (d) => d.toISOString().slice(0, 10);
    setFrom(iso(start));
    setTo(iso(end));
  }, []);

  // When team selection becomes available, set as default filter
  React.useEffect(() => {
    if (team?.id) {
      setTeamFilter(team.id);
    }
  }, [team]);

  const fetchViaBackend = React.useCallback(async () => {
    const data = await apiGet('/manager/reports', {
      params: {
        team: teamFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        limit,
      },
    });
    return Array.isArray(data) ? data : (data?.items || []);
  }, [teamFilter, from, to, limit]);

  const fetchViaSupabase = React.useCallback(async () => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
    }
    let q = supabase
      .from('weekly_reports')
      .select('id, created_at, week_start, progress, blockers, plans, user_id, tags')
      .order('created_at', { ascending: false });
    if (Number.isFinite(limit) && limit > 0) {
      q = q.limit(limit);
    }
    const { data, error: err } = await q;
    if (err) {
      const msg = String(err.message || '').toLowerCase();
      const looksLikeRls =
        msg.includes('row-level security') ||
        msg.includes('permission') ||
        msg.includes('not authorized') ||
        msg.includes('rls');
      if (looksLikeRls) {
        throw new Error(
          'RLS blocked the request. For Manager views you need a backend (set REACT_APP_API_BASE) or design RLS/policies for team-wide access.'
        );
      }
      throw new Error(err.message || 'Failed to load reports.');
    }
    return Array.isArray(data) ? data : [];
  }, [supabase, limit]);

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const data = hasApi ? await fetchViaBackend() : await fetchViaSupabase();
      setRows(data);
      addToast('success', `Loaded ${data.length} report(s).`);
    } catch (e) {
      setRows([]);
      const msg = e?.message || 'Failed to load reports.';
      setError(msg);
      showApiError(addToast, e, 'Failed to load reports', { dedupeKey: 'mgr-reports-load' });
    } finally {
      setLoading(false);
    }
  }, [hasApi, fetchViaBackend, fetchViaSupabase, addToast]);

  // Fetch reports when component mounts and whenever dependencies change
  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d || '');
    }
  };
  const truncate = (t, n = 140) => {
    const s = String(t || '').trim();
    return s.length > n ? `${s.slice(0, n)}…` : s;
  };

  const onGenerateSummary = async () => {
    setAiLoading(true);
    setError(null);
    setSummary(null);
    try {
      if (!hasApi) {
        throw new Error(
          'Backend API base is not configured (REACT_APP_API_BASE). AI summary requires backend integration.'
        );
      }
      const res = await apiPost('/manager/ai/summary', {
        team: teamFilter || null,
        from: from || null,
        to: to || null,
      });
      // Expect { summary: string } but handle variations
      const text = res?.summary || res?.data || JSON.stringify(res);
      setSummary(String(text));
      addToast('success', 'AI summary generated.');
    } catch (e) {
      setSummary(null);
      const msg = e?.message || 'Failed to generate AI summary.';
      setError(msg);
      showApiError(addToast, e, 'Failed to generate AI summary', { dedupeKey: 'mgr-ai-summary' });
    } finally {
      setAiLoading(false);
    }
  };

  // Conditional returns AFTER hooks are declared keeps hooks ordering consistent
  if (teamLoading) {
    return (
      <div className="card">
        <div className="helper" aria-busy="true">Loading…</div>
      </div>
    );
  }

  if (!team) {
    return <Navigate to="/select-team" replace state={{ from: location }} />;
  }

  return (
    <>
      <div className="page-title" style={{ marginBottom: 8 }}>
        <h1>Team Reports · {team?.name || team?.id}</h1>
        <span className="helper">Manager view with filters and AI summary</span>
        {authDisabled && (
          <span
            className="test-mode-pill"
            aria-label="Test Mode active"
            title="Authentication is disabled for local testing"
            style={{ marginLeft: 8 }}
          >
            Test Mode
          </span>
        )}
      </div>

      {!hasApi && (
        <div className="test-mode-banner">
          <ConfigWarning message="Backend API base not configured. Reading from Supabase directly; access may be limited by RLS. Set REACT_APP_API_BASE to enable full manager features (filters, AI summaries, team scope)." />
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr)) auto', gap: 8 }}>
          <div>
            <label className="helper" htmlFor="team">Team</label>
            <input
              id="team"
              className="textarea"
              style={{ minHeight: 'auto' }}
              type="text"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              placeholder="Team ID"
              title="Using selected team by default"
            />
          </div>
          <div>
            <label className="helper" htmlFor="from">From</label>
            <input id="from" className="textarea" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="helper" htmlFor="to">To</label>
            <input id="to" className="textarea" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="helper" htmlFor="limit">Limit</label>
            <input
              id="limit"
              className="textarea"
              type="number"
              min="1"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button type="button" className="btn secondary" onClick={fetchReports} disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'end' }}>
            <button type="button" className="btn" onClick={onGenerateSummary} disabled={aiLoading}>
              {aiLoading ? 'Generating…' : 'Generate AI Summary'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="helper" role="alert" style={{ color: 'var(--error)' }}>
            {error}
          </div>
        </div>
      )}

      {summary && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="page-title" style={{ marginBottom: 6 }}>
            <h1 style={{ fontSize: 16, margin: 0 }}>AI Summary</h1>
          </div>
          <div className="helper" style={{ whiteSpace: 'pre-wrap' }}>{summary}</div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="helper" aria-busy="true">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="helper">No reports found for the selected filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" role="table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Week</th>
                  <th>Progress</th>
                  <th>Blockers</th>
                  <th>Plans</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{String(r.week_start || '').slice(0, 10)}</td>
                    <td title={r.progress}>{truncate(r.progress)}</td>
                    <td title={r.blockers}>{truncate(r.blockers)}</td>
                    <td title={r.plans}>{truncate(r.plans)}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{r.user_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default ManagerReports;
