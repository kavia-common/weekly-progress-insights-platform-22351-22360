import React from 'react';
import { getApiBase, apiGet, apiPost } from '../services/apiClient';
import ConfigWarning from '../components/ConfigWarning';
import { useToast } from '../components/ToastProvider';
import { Link } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * AdminDashboard
 * - Users: list users via backend endpoint if available, else show guidance.
 * - Reporting Windows: CRUD UI with local state; calls backend if available, else TODO markers.
 * - Analytics: basic overview scaffolding with placeholder charts and KPIs.
 */
const AdminDashboard = () => {
  const apiBase = getApiBase();
  const { addToast } = useToast();

  const [tab, setTab] = React.useState('users'); // 'users' | 'windows' | 'analytics'

  // Users state
  const [users, setUsers] = React.useState([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [usersError, setUsersError] = React.useState(null);

  // Reporting windows state (local)
  const [windows, setWindows] = React.useState([]);
  const [loadingWindows, setLoadingWindows] = React.useState(false);
  const [windowsError, setWindowsError] = React.useState(null);

  const fetchUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      if (!apiBase) {
        throw new Error('Backend API base is not configured (set REACT_APP_API_BASE).');
      }
      const data = await apiGet('/admin/users');
      setUsers(Array.isArray(data) ? data : (data?.items || []));
      addToast('success', `Loaded ${Array.isArray(data) ? data.length : (data?.items?.length || 0)} user(s).`);
    } catch (e) {
      setUsers([]);
      setUsersError(e?.message || 'Failed to load users.');
      addToast('error', e?.message || 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [apiBase, addToast]);

  const fetchWindows = React.useCallback(async () => {
    setLoadingWindows(true);
    setWindowsError(null);
    try {
      if (!apiBase) {
        // Fallback sample data for local-only mode
        setWindows([
          { id: 'sample-1', name: 'Q1 2025', start: '2025-01-01', end: '2025-03-31', status: 'open' },
          { id: 'sample-2', name: 'Q2 2025', start: '2025-04-01', end: '2025-06-30', status: 'planned' },
        ]);
      } else {
        const data = await apiGet('/admin/reporting-windows');
        setWindows(Array.isArray(data) ? data : (data?.items || []));
      }
    } catch (e) {
      setWindows([]);
      setWindowsError(e?.message || 'Failed to load reporting windows.');
    } finally {
      setLoadingWindows(false);
    }
  }, [apiBase]);

  React.useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'windows') fetchWindows();
  }, [tab, fetchUsers, fetchWindows]);

  // Reporting windows CRUD handlers (placeholders)
  const addWindow = async () => {
    const name = prompt('Window name:');
    const start = prompt('Start date (YYYY-MM-DD):');
    const end = prompt('End date (YYYY-MM-DD):');
    if (!name || !start || !end) return;
    const newItem = { id: `local-${Date.now()}`, name, start, end, status: 'planned' };
    setWindows((prev) => [newItem, ...prev]);
    try {
      if (apiBase) {
        await apiPost('/admin/reporting-windows', newItem);
        addToast('success', 'Reporting window created.');
        fetchWindows();
      } else {
        addToast('info', 'Created in local state only. Configure backend to persist.');
      }
    } catch (e) {
      addToast('error', e?.message || 'Failed to create reporting window.');
    }
  };

  const deleteWindow = async (id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    try {
      if (apiBase) {
        await apiPost(`/admin/reporting-windows/${encodeURIComponent(id)}/delete`);
        addToast('success', 'Reporting window deleted.');
        fetchWindows();
      } else {
        addToast('info', 'Deleted from local state only.');
      }
    } catch (e) {
      addToast('error', e?.message || 'Failed to delete reporting window.');
    }
  };

  const TabButton = ({ value, label }) => (
    <button
      type="button"
      className={`btn ${tab === value ? '' : 'secondary'}`}
      onClick={() => setTab(value)}
      aria-pressed={tab === value ? 'true' : 'false'}
    >
      {label}
    </button>
  );

  return (
    <div className="card">
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Admin</h1>
          <span className="helper">Manage users, reporting windows, and analytics</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <TabButton value="users" label="Users" />
          <TabButton value="windows" label="Reporting Windows" />
          <TabButton value="analytics" label="Analytics" />
          <Link to="/admin/users" className="btn secondary" title="Open Users management page">
            Open Users Page
          </Link>
        </div>
      </div>

      {!apiBase && (
        <div className="test-mode-banner">
          <ConfigWarning message="Backend not configured. Users and persistence features require a backend (set REACT_APP_API_BASE). UI operates in local-only mode where possible." />
        </div>
      )}

      {tab === 'users' && (
        <div>
          {loadingUsers ? (
            <div className="helper" aria-busy="true">Loading users…</div>
          ) : usersError ? (
            <div className="helper" role="alert" style={{ color: 'var(--error)' }}>{usersError}</div>
          ) : users.length === 0 ? (
            <div className="helper">No users found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" role="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.id}</td>
                      <td>{u.email || u.user_email || '—'}</td>
                      <td>{u.role || u.app_role || u.app_metadata?.role || '—'}</td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'windows' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="helper">Define when employees should submit reports.</div>
            <button type="button" className="btn" onClick={addWindow}>New Window</button>
          </div>
          {loadingWindows ? (
            <div className="helper" aria-busy="true">Loading reporting windows…</div>
          ) : windowsError ? (
            <div className="helper" role="alert" style={{ color: 'var(--error)' }}>{windowsError}</div>
          ) : windows.length === 0 ? (
            <div className="helper">No reporting windows configured.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" role="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {windows.map((w) => (
                    <tr key={w.id}>
                      <td>{w.name}</td>
                      <td>{w.start}</td>
                      <td>{w.end}</td>
                      <td>{w.status || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn secondary" onClick={() => deleteWindow(w.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!apiBase && (
            <div className="helper" style={{ marginTop: 8 }}>
              Persistence TODO: Hook endpoints like GET/POST /admin/reporting-windows when backend is available.
            </div>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div>
          <div className="kpis">
            <div className="kpi">
              <div className="label">Active Users</div>
              <div className="value">128</div>
            </div>
            <div className="kpi">
              <div className="label">Reports (30d)</div>
              <div className="value">539</div>
            </div>
            <div className="kpi">
              <div className="label">On-time Rate</div>
              <div className="value">91%</div>
            </div>
            <div className="kpi">
              <div className="label">Avg. Sentiment</div>
              <div className="value">Positive</div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 8 }}>
            <div className="chart">Analytics Chart Placeholder</div>
          </div>
          {!apiBase && (
            <div className="helper" style={{ marginTop: 8 }}>
              Connect backend analytics endpoints to replace placeholders with real data.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
