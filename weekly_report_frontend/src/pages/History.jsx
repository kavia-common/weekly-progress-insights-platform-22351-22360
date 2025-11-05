import React from 'react';
import { getSupabaseConfigStatus } from '../lib/supabaseClient';
import { isAuthDisabled } from '../lib/featureFlags';
import { useToast } from '../components/ToastProvider';
import ConfigWarning from '../components/ConfigWarning';
import { getWeeklyReports } from '../services/reportsService';

/**
 * PUBLIC_INTERFACE
 * History fetches and lists weekly reports from Supabase.
 * Renders loading, empty, and error states. In Test Mode, if RLS blocks anon SELECT,
 * surfaces an inline hint to create a dev SELECT policy for anon.
 */
const History = () => {
  const { isConfigured } = getSupabaseConfigStatus();
  const authDisabled = isAuthDisabled();
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [rlsHint, setRlsHint] = React.useState(null);

  const truncate = (text, n = 120) => {
    if (!text) return '';
    const t = String(text).trim();
    return t.length > n ? `${t.slice(0, n)}…` : t;
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  const formatWeek = (week_start) => {
    // Display ISO date for week start; can be enhanced to ISO week number
    if (!week_start) return '';
    try {
      const dt = new Date(week_start);
      // Ensure consistent YYYY-MM-DD
      return dt.toISOString().slice(0, 10);
    } catch {
      return String(week_start);
    }
  };

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setRlsHint(null);

    if (!isConfigured) {
      setLoading(false);
      setRows([]);
      setError('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      return;
    }

    try {
      const data = await getWeeklyReports({ limit: 50, orderBy: 'created_at' });
      setRows(Array.isArray(data) ? data : []);
      addToast('success', `Loaded ${Array.isArray(data) ? data.length : 0} report(s).`);
    } catch (e) {
      const msg = e?.message || 'Failed to load reports.';
      setError(msg);
      // Detect RLS guidance hint in Test Mode
      if (authDisabled && /row level security|rls|anon|select blocked/i.test(msg)) {
        setRlsHint(
          'Select blocked by RLS for anon. For local dev in Test Mode, add a SELECT policy for role "anon" on public.weekly_reports, or sign in via magic-link.'
        );
      }
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, authDisabled, addToast]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="card" aria-live="polite">
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>History</h1>
          <span className="helper">Recent weekly reports</span>
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
        <div>
          <button type="button" className="btn secondary" onClick={fetchReports} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {!isConfigured && (
        <ConfigWarning message="Supabase configuration missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY to enable data fetching." />
      )}

      {authDisabled && rlsHint && (
        <div className="test-mode-banner">
          <ConfigWarning message={rlsHint} />
        </div>
      )}

      {error && isConfigured && !loading && (
        <div className="helper" style={{ color: 'var(--error)', marginBottom: 8 }} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="helper">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="helper">No weekly reports found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" role="table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Progress</th>
                <th>Blockers</th>
                <th>Plans</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatWeek(r.week_start)}</td>
                  <td title={r.progress}>{truncate(r.progress)}</td>
                  <td title={r.blockers}>{truncate(r.blockers)}</td>
                  <td title={r.plans}>{truncate(r.plans)}</td>
                  <td>{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default History;
