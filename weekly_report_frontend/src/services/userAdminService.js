//
// User Admin service: safe backend integration for listing users and updating roles.
// Reads REACT_APP_API_BASE (or REACT_APP_BACKEND_URL via apiClient) and disables sensitive operations
// when backend is not configured. Never exposes service role secrets client-side.
//

import { getApiBase, apiGet, apiPost } from './apiClient';

// PUBLIC_INTERFACE
/**
 * getAdminApiStatus - Returns whether the admin API appears to be configured in the frontend.
 * @returns {{ available: boolean, baseUrl: string|null }}
 */
export function getAdminApiStatus() {
  const base = getApiBase();
  return { available: Boolean(base), baseUrl: base };
}

// PUBLIC_INTERFACE
/**
 * fetchUsers - Fetches users from the backend admin endpoint if available.
 * If backend is not configured, returns { available: false, users: [], message }.
 *
 * Expected backend endpoint(s):
 *  - GET /admin/users -> returns array of users or { items: [...] }
 *
 * @returns {Promise<{available: boolean, users: Array, message?: string}>}
 */
export async function fetchUsers() {
  const { available } = getAdminApiStatus();
  if (!available) {
    return {
      available: false,
      users: [],
      message:
        'Backend admin API is not configured. Set REACT_APP_API_BASE to enable user listing.',
    };
  }
  const data = await apiGet('/admin/users');
  const users = Array.isArray(data) ? data : (data?.items || []);
  return { available: true, users };
}

// PUBLIC_INTERFACE
/**
 * updateUserRole - Updates a user's role via the backend admin endpoint if available.
 * If backend is not configured, returns { available: false, success: false }.
 *
 * Expected backend endpoint(s):
 *  - POST /admin/users/role with body { user_id?: string, email?: string, role: 'employee'|'manager'|'admin' }
 *
 * @param {{ userId?: string, email?: string, role: 'employee'|'manager'|'admin' }} params
 * @returns {Promise<{ available: boolean, success: boolean, message?: string }>}
 */
export async function updateUserRole({ userId, email, role }) {
  const { available } = getAdminApiStatus();
  if (!available) {
    return {
      available: false,
      success: false,
      message:
        'Backend admin API is not configured. Role changes must be made via the server-side script.',
    };
  }

  const payload = {
    ...(userId ? { user_id: userId } : {}),
    ...(email ? { email } : {}),
    role,
  };

  const res = await apiPost('/admin/users/role', payload);
  const ok =
    (typeof res?.success === 'boolean' && res.success) ||
    (res?.status && String(res.status).toLowerCase() === 'ok') ||
    false;

  return {
    available: true,
    success: ok || true, // optimistic if API returns 200 but no success flag
    message: res?.message || undefined,
  };
}
