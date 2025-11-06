//
// Lightweight toast helpers for API success/error messages.
// Keeps messages concise, adds context when helpful, and supports deduplication
// via deterministic IDs derived from context+message.
//
// PUBLIC_INTERFACE
/**
 * showApiSuccess - standard success toast with optional details and dedupe key.
 * @param {(type: 'success'|'error'|'info', message: string, opts?: { duration?: number, id?: string }) => string} addToast
 * @param {string} message - main message to display
 * @param {{ details?: string, dedupeKey?: string, duration?: number }} [opts]
 */
export function showApiSuccess(addToast, message, opts = {}) {
  const { details, dedupeKey, duration } = opts || {};
  const full = details ? `${message} — ${trim(details)}` : message;
  return addToast('success', full, { duration, id: dedupeKey ? `ok:${dedupeKey}` : undefined });
}

// PUBLIC_INTERFACE
/**
 * showApiInfo - standard info toast with dedupe support.
 * @param {(type: 'success'|'error'|'info', message: string, opts?: { duration?: number, id?: string }) => string} addToast
 * @param {string} message
 * @param {{ details?: string, dedupeKey?: string, duration?: number }} [opts]
 */
export function showApiInfo(addToast, message, opts = {}) {
  const { details, dedupeKey, duration } = opts || {};
  const full = details ? `${message} — ${trim(details)}` : message;
  return addToast('info', full, { duration, id: dedupeKey ? `info:${dedupeKey}` : undefined });
}

// PUBLIC_INTERFACE
/**
 * showApiError - standard error toast with parsed error and dedupe support.
 * @param {(type: 'success'|'error'|'info', message: string, opts?: { duration?: number, id?: string }) => string} addToast
 * @param {unknown} error - can be Error or any thrown value
 * @param {string} [fallbackMessage='Request failed'] - fallback if error lacks message
 * @param {{ context?: string, dedupeKey?: string, duration?: number }} [opts]
 */
export function showApiError(addToast, error, fallbackMessage = 'Request failed', opts = {}) {
  const { context, dedupeKey, duration } = opts || {};
  const parsed = parseError(error);
  const prefix = context ? `${context}: ` : '';
  const msg = `${prefix}${parsed || fallbackMessage}`;
  return addToast('error', msg, { duration, id: dedupeKey ? `err:${dedupeKey}` : undefined });
}

// PUBLIC_INTERFACE
/**
 * parseError - returns a concise human-readable message from an error-like object.
 * @param {unknown} err
 * @returns {string}
 */
export function parseError(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.toString();
  try {
    if (typeof err === 'object') {
      // common fetch error bodies
      if (err.message) return String(err.message);
      if (err.error) return String(err.error);
    }
  } catch {
    // no-op
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Trim helper to keep details short
function trim(s) {
  const v = String(s || '').trim();
  return v.length > 180 ? `${v.slice(0, 180)}…` : v;
}
