//
// Centralized API client for backend access from the frontend.
// - Uses only public base URLs via environment variables.
// - Attaches Authorization: Bearer <token> when available from Supabase auth.
// - Defaults the API base to the provided cloud URL when env is unset.
// - JSON by default, CORS safe for browser.
//
// PUBLIC_INTERFACE
/**
 * getApiBase - Returns the configured backend API base URL from environment (if any).
 * Prefers REACT_APP_API_BASE, falls back to REACT_APP_BACKEND_URL, then default.
 */
import { getSupabase } from '../lib/supabaseClient';

export function getApiBase() {
  const a = process.env.REACT_APP_API_BASE || '';
  const b = process.env.REACT_APP_BACKEND_URL || '';
  const fallback = 'https://digitalt3-weekly-report-platform-1.kavia.app';
  const base = (a || b || fallback || '').trim().replace(/\/*$/, '');
  return base || null;
}

// PUBLIC_INTERFACE
/**
 * getAuthToken - Returns a Promise resolving to the current auth access token if available.
 * Uses Supabase session access_token. If your backend requires a Google ID token,
 * adjust here to retrieve and return an ID token instead.
 */
export async function getAuthToken() {
  try {
    const supabase = getSupabase?.();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    const token = data?.session?.access_token || null;
    return token || null;
  } catch {
    return null;
  }
}

/**
 * INTERNAL: Build full URL from path and optional query params
 */
function buildUrl(path, params) {
  const base = getApiBase();
  if (!base) return null;
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(base + p);
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * INTERNAL: Merge headers ensuring JSON defaults and Authorization when token present
 */
async function buildHeaders(extra) {
  const token = await getAuthToken();
  const headers = {
    Accept: 'application/json',
    ...(extra || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// PUBLIC_INTERFACE
/**
 * apiGet - Performs a GET request with Authorization when available.
 * Throws a friendly error if base is missing so UI can render inline guidance.
 */
export async function apiGet(path, { params, headers, credentials } = {}) {
  const url = buildUrl(path, params);
  if (!url) {
    const err = new Error('Backend API base is not configured (set REACT_APP_API_BASE or REACT_APP_BACKEND_URL).');
    err.code = 'NO_API_BASE';
    throw err;
  }
  const finalHeaders = await buildHeaders(headers);
  const res = await fetch(url, {
    method: 'GET',
    headers: finalHeaders,
    mode: 'cors',
    credentials: credentials || 'omit',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `GET ${path} failed with ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}

// PUBLIC_INTERFACE
/**
 * apiPost - Performs a POST request with JSON body and Authorization when available.
 */
export async function apiPost(path, body, { headers, credentials } = {}) {
  const url = buildUrl(path);
  if (!url) {
    const err = new Error('Backend API base is not configured (set REACT_APP_API_BASE or REACT_APP_BACKEND_URL).');
    err.code = 'NO_API_BASE';
    throw err;
  }
  const finalHeaders = await buildHeaders({
    'Content-Type': 'application/json',
    ...(headers || {}),
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: finalHeaders,
    mode: 'cors',
    credentials: credentials || 'omit',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `POST ${path} failed with ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}
