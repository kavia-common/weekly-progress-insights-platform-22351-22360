import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import ConfigWarning from '../components/ConfigWarning';
import { getSupabase, getSupabaseConfigStatus } from '../lib/supabaseClient';
import { fetchUsers, updateUserRole, getAdminApiStatus } from '../services/userAdminService';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
/**
 * AdminUsers - Minimal admin UI for role management.
 * - Route: /admin/users (protected by AdminRoute).
 * - If backend admin API is configured (REACT_APP_API_BASE), lists users and allows updating roles.
 * - If backend is not configured, shows a guided placeholder with instructions for using the server-side script.
 * - Optional: If Supabase profiles table RLS allows, shows the current user's role from profiles as a reference.
 */
const AdminUsers = () => {
  const { isConfigured: supabaseConfigured } = getSupabaseConfigStatus();
  const supabase = getSupabase();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [apiAvailable, setApiAvailable] = React.useState(false);
  const [rowBusy, setRowBusy] = React.useState({}); // { userId: boolean }

  // Optional local info when backend is not configured
  const [ownProfileRole, setOwnProfileRole] = React.useState(null);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = getAdminApiStatus();
      setApiAvailable(status.available);
      const res = await fetchUsers();
      if (!res.available) {
        setUsers([]);
        if (res.message) {
          // Not an error per se; display guidance later
          // eslint-disable-next-line no-console
          console.debug('[AdminUsers] Backend not available:', res.message);
        }
      } else {
        setUsers(Array.isArray(res.users) ? res.users : []);
        addToast('success', `Loaded ${Array.isArray(res.users) ? res.users.length : 0} user(s).`);
      }
    } catch (e) {
      setUsers([]);
      const msg = e?.message || 'Failed to load users.';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Optional: try to read own profile role if Supabase configured and profiles accessible
  const tryLoadOwnProfile = React.useCallback(async () => {
    if (!supabaseConfigured || !supabase || !user?.id) return;
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('user_id', user.id)
        .single();
      if (!err) {
        const r = (data?.role || '').toString().toLowerCase();
        if (r) setOwnProfileRole(r);
      }
    } catch {
      // ignore; RLS may block
    }
  }, [supabaseConfigured, supabase, user]);

  React.useEffect(() => {
    loadUsers();
    tryLoadOwnProfile();
  }, [loadUsers, tryLoadOwnProfile]);

  const allowedRoles = ['employee', 'manager', 'admin'];

  const normalizeRole = (u) => {
    const r =
      u?.role ||
      u?.app_role ||
      u?.app_metadata?.role ||
      u?.user_metadata?.role ||
      '';
    return String(r || '').toLowerCase() || '';
  };

  const onChangeRole = async (u, nextRole) => {
    if (!apiAvailable) {
      addToast(
        'info',
        'Role changes are disabled in the browser when backend is not configured. Use the server-side script.'
      );
      return;
    }
    const userId = u?.id || u?.user_id || null;
    const email = u?.email || u?.user_email || null;
    if (!userId && !email) {
      addToast('error', 'Cannot identify target user (missing id/email).');
      return;
    }
    setRowBusy((prev) => ({ ...prev, [userId || email]: true }));
    try {
      const res = await updateUserRole({ userId, email, role: nextRole });
      if (!res.available) {
        addToast('error', res.message || 'Role update not available.');
        return;
      }
      if (res.success) {
        addToast('success', 'Role updated.');
        // Update local state
        setUsers((prev) =>
          prev.map((x) => {
            const match = (x.id && x.id === userId) || (!x.id && email && (x.email === email || x.user_email === email));
            return match
              ? { ...x, role: nextRole, app_role: nextRole, app_metadata: { ...(x.app_metadata || {}), role: nextRole } }
              : x;
          })
        );
      } else {
        addToast('error', res.message || 'Role update failed.');
      }
    } catch (e) {
      addToast('error', e?.message || 'Role update failed.');
    } finally {
      setRowBusy((prev) => {
        const key = userId || email;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const Guidance = () => (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="page-title">
        <h1 style={{ fontSize: 16, margin: 0 }}>Role Management Setup</h1>
      </div>
      <div className="helper" style={{ marginBottom: 8 }}>
        Backend admin API is not configured. To manage roles securely, use the server-side script included in this repo.
      </div>
      <ol className="helper" style={{ margin: 0, paddingLeft: 18 }}>
        <li>Create a .env.server with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (do NOT commit it).</li>
        <li>Verify connectivity: npm run check-role-script</li>
        <li>Set role by email: npm run set-role -- --email user@example.com --role manager</li>
        <li>Set role by user id: npm run set-role -- --user-id &lt;uuid&gt; --role admin</li>
        <li>Optionally sync to public.profiles: add --sync-profile</li>
      </ol>
      <div className="helper" style={{ marginTop: 8 }}>
        Then, configure REACT_APP_API_BASE for browser-based admin actions if you have a secure backend endpoint.
      </div>
      <div style={{ marginTop: 8 }}>
        <Link to="/admin" className="btn secondary">Back to Admin Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="card" aria-live="polite">
      <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Admin · Users</h1>
          <span className="helper">Manage user roles</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin" className="btn secondary">Admin Home</Link>
        </div>
      </div>

      {!apiAvailable && (
        <div className="test-mode-banner">
          <ConfigWarning message="Backend admin API not configured. Role changes are disabled in the browser. Use the server-side script provided in this repository." />
        </div>
      )}

      {error && (
        <div className="helper" role="alert" style={{ color: 'var(--error)', marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="helper">
          {apiAvailable
            ? 'Users loaded from backend admin endpoint.'
            : 'Showing guided placeholder. Configure backend to enable full user management.'}
        </div>
        <div>
          <button
            type="button"
            className="btn secondary"
            onClick={loadUsers}
            disabled={loading}
            aria-busy={loading ? 'true' : 'false'}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="helper" aria-busy="true">Loading users…</div>
      ) : apiAvailable && users.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" role="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Current Role</th>
                <th style={{ width: 220 }}>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const currentRole = normalizeRole(u);
                const key = u?.id || u?.email || u?.user_email || String(Math.random());
                const idOrEmail = u?.id || u?.email || u?.user_email;
                const busy = Boolean(rowBusy[idOrEmail]);
                return (
                  <tr key={key}>
                    <td>{u?.email || u?.user_email || '—'}</td>
                    <td>{currentRole || '—'}</td>
                    <td>
                      <select
                        className="textarea"
                        style={{ minHeight: 'auto' }}
                        value={currentRole || ''}
                        onChange={(e) => onChangeRole(u, e.target.value)}
                        disabled={!apiAvailable || busy}
                        aria-label="Update user role"
                        title={apiAvailable ? 'Update role' : 'Backend not configured; changes disabled'}
                      >
                        <option value="" disabled>Choose role…</option>
                        {allowedRoles.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {busy && (
                        <span className="helper" style={{ marginLeft: 8 }}>Saving…</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="helper">No users to display.</div>
          {!apiAvailable && <Guidance />}
        </>
      )}

      {!apiAvailable && supabaseConfigured && ownProfileRole && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="page-title">
            <h1 style={{ fontSize: 16, margin: 0 }}>Your current profile role</h1>
          </div>
          <div className="helper">
            From public.profiles (if available): <strong>{ownProfileRole}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
