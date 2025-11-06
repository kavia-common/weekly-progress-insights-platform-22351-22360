//
// Minimal API client for conditional backend access from the frontend.
// Keeps secrets out of REACT_APP_*; uses only public base URLs.
//
/**
 * PUBLIC_INTERFACE
 * getApiBase - Returns the configured backend API base URL from environment (if any).
 * Prefers REACT_APP_API_BASE, falls back to REACT_APP_BACKEND_URL.
 */
export function getApiBase() {
  const a = process.env.REACT_APP_API_BASE || '';
  const b = process.env.REACT_APP_BACKEND_URL || '';
  const base = (a || b || '').trim().replace(/\/+$/, '');
  return base || null;
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
 * PUBLIC_INTERFACE
 * apiGet - Performs a GET request if API base is configured. Throws a friendly
 * error if the base is missing so UI can render inline guidance.
 */
export async function apiGet(path, { params, headers } = {}) {
  const url = buildUrl(path, params);
  if (!url) {
    const err = new Error('Backend API base is not configured (set REACT_APP_API_BASE or REACT_APP_BACKEND_URL).');
    err.code = 'NO_API_BASE';
    throw err;
  }
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `GET ${path} failed with ${res.status}`);
  }
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * apiPost - Performs a POST request if API base is configured. Throws a friendly error if base is missing.
 */
export async function apiPost(path, body, { headers } = {}) {
  const url = buildUrl(path);
  if (!url) {
    const err = new Error('Backend API base is not configured (set REACT_APP_API_BASE or REACT_APP_BACKEND_URL).');
    err.code = 'NO_API_BASE';
    throw err;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `POST ${path} failed with ${res.status}`);
  }
  return res.json();
}
