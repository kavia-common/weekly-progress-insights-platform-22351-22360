//
// Team service with graceful fallbacks.
// Reads REACT_APP_API_BASE (or REACT_APP_BACKEND_URL through apiClient).
// Provides getTeams, createTeam, setUserTeam with backend integration if available, else local-only behavior.
// Also includes localStorage helpers for temporary persistence.
//
import { getApiBase, apiGet, apiPost } from './apiClient';

const LS_TEAM_KEY = 'wr.selectedTeam';

// PUBLIC_INTERFACE
/**
 * hasTeamApi - Returns whether team-related backend API is configured.
 * @returns {{ available: boolean, baseUrl: string|null }}
 */
export function hasTeamApi() {
  const base = getApiBase();
  return { available: Boolean(base), baseUrl: base || null };
}

// PUBLIC_INTERFACE
/**
 * getTeams - Fetch teams from backend if available; else return guided sample teams.
 * Expected backend endpoints:
 *  - GET /api/teams -> returns array of { id, name } or { items: [...] }
 * Note: Path includes /api per backend guidance.
 * @returns {Promise<{ available: boolean, teams: Array<{id:string,name:string}>, message?: string }>}
 */
export async function getTeams() {
  const { available } = hasTeamApi();
  if (!available) {
    // Local-only guided sample
    return {
      available: false,
      teams: [
        { id: 'alpha', name: 'Alpha' },
        { id: 'beta', name: 'Beta' },
        { id: 'gamma', name: 'Gamma' },
      ],
      message: 'Backend not configured. Showing sample teams. Selection will be stored locally and not persisted.',
    };
  }
  // TODO: If backend path differs, adjust here.
  const data = await apiGet('/teams');
  const items = Array.isArray(data) ? data : (data?.items || []);
  // Normalize shape
  const teams = items.map((t) => ({
    id: String(t.id ?? t.team_id ?? t.slug ?? t.name ?? '').toLowerCase() || cryptoId(),
    name: String(t.name ?? t.team_name ?? t.id ?? 'Untitled Team'),
  }));
  return { available: true, teams };
}

// PUBLIC_INTERFACE
/**
 * createTeam - Creates a team when backend is configured; otherwise returns a local-only entry.
 * Expected backend endpoint:
 *  - POST /api/teams with { name } -> returns created { id, name }
 * @param {string} name
 * @returns {Promise<{ available: boolean, team: {id:string,name:string}, message?: string }>}
 */
export async function createTeam(name) {
  const safeName = String(name || '').trim();
  if (!safeName) {
    throw new Error('Team name is required.');
  }

  const { available } = hasTeamApi();
  if (!available) {
    return {
      available: false,
      team: { id: slugify(safeName), name: safeName },
      message: 'Backend not configured. Created a local-only team for this session.',
    };
  }

  // TODO: If backend path differs, adjust here.
  const res = await apiPost('/teams', { name: safeName });
  const id = String(res?.id ?? res?.team_id ?? slugify(safeName));
  return {
    available: true,
    team: { id, name: safeName },
  };
}

// PUBLIC_INTERFACE
/**
 * summarizeTeam - Calls the summarize action for a team.
 * Expected backend endpoint:
 *  - POST /api/teams/:teamId/summarize -> returns { summary: string }
 * @param {string} teamId
 * @returns {Promise<{ summary: string, raw?: any }>}
 */
export async function summarizeTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) throw new Error('teamId is required');
  const { available } = hasTeamApi();
  if (!available) {
    throw new Error('Backend not configured. Team summarize requires backend API.');
  }
  // TODO: If backend path differs, adjust here.
  const res = await apiPost(`/teams/${encodeURIComponent(id)}/summarize`, {});
  const summary = String(res?.summary || res?.data || '');
  return { summary, raw: res };
}

// PUBLIC_INTERFACE
/**
 * setUserTeam - Persist the user's team selection to backend if available; otherwise no-op (local only).
 * Expected backend endpoint:
 *  - POST /api/users/me/team with { team_id }
 * @param {string} teamId
 * @returns {Promise<{ available: boolean, success: boolean, message?: string }>}
 */
export async function setUserTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) throw new Error('teamId is required');

  const { available } = hasTeamApi();
  if (!available) {
    return {
      available: false,
      success: true,
      message: 'Backend not configured. Team will be remembered locally only.',
    };
  }

  // TODO: If backend path differs, adjust here.
  const res = await apiPost('/users/me/team', { team_id: id });
  const ok =
    (typeof res?.success === 'boolean' && res.success) ||
    (res?.status && String(res.status).toLowerCase() === 'ok') ||
    Boolean(res?.updated || res?.saved);
  return { available: true, success: ok, message: res?.message };
}

// PUBLIC_INTERFACE
/**
 * getStoredTeam - Reads the locally stored team selection.
 * @returns {{ id: string, name?: string } | null}
 */
export function getStoredTeam() {
  try {
    const raw = localStorage.getItem(LS_TEAM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
  } catch {
    // ignore parse errors
  }
  return null;
}

// PUBLIC_INTERFACE
/**
 * storeTeamLocal - Stores the selected team locally for fallback persistence.
 * @param {{ id: string, name?: string }} team
 */
export function storeTeamLocal(team) {
  if (!team || !team.id) return;
  try {
    localStorage.setItem(LS_TEAM_KEY, JSON.stringify({ id: String(team.id), name: team.name || '' }));
  } catch {
    // ignore quota errors
  }
}

// PUBLIC_INTERFACE
/**
 * clearStoredTeam - Clears the locally stored team selection.
 */
export function clearStoredTeam() {
  try {
    localStorage.removeItem(LS_TEAM_KEY);
  } catch {
    // ignore
  }
}

// Helpers
function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
