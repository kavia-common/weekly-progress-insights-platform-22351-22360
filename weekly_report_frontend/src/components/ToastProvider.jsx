import React from 'react';
import { cn } from '../utils/cn';

// Toast types
const TYPES = {
  success: {
    icon: '✅',
    className: 'toast-success',
    ariaRole: 'status',
  },
  error: {
    icon: '⛔',
    className: 'toast-error',
    ariaRole: 'alert',
  },
  info: {
    icon: 'ℹ️',
    className: 'toast-info',
    ariaRole: 'status',
  },
};

// PUBLIC_INTERFACE
/**
 * useToast - Hook to access toast actions (show success/error/info).
 */
export function useToast() {
  return React.useContext(ToastContext);
}

const ToastContext = React.createContext({
  // PUBLIC_INTERFACE
  /**
   * addToast - Show a toast with message and type.
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   * @param {object} [opts] - { duration?: number, id?: string }
   */
  addToast: (_type, _message, _opts) => {},
  // PUBLIC_INTERFACE
  /**
   * removeToast - Dismiss a toast by id.
   */
  removeToast: (_id) => {},
});

// PUBLIC_INTERFACE
/**
 * ToastProvider - Provides a simple toast notification system with:
 * - Bottom-right stack
 * - Auto-dismiss
 * - Deduplication within a short time window to prevent spam
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  // Track recent keys to avoid duplicate messages flooding
  // Key is either provided id or `${type}:${message}`
  const recentRef = React.useRef(new Map()); // key -> timestamp
  const DEDUPE_WINDOW_MS = 4000;
  const MAX_TOASTS = 5; // keep it unobtrusive

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const cleanupRecent = React.useCallback(() => {
    const now = Date.now();
    const m = recentRef.current;
    for (const [k, ts] of m.entries()) {
      if (now - ts > DEDUPE_WINDOW_MS) m.delete(k);
    }
  }, []);

  const addToast = React.useCallback(
    (type, message, opts = {}) => {
      const safeType = TYPES[type] ? type : 'info';
      const id = opts.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const duration = Number.isFinite(opts.duration) ? opts.duration : 3500;

      // Deduplication: if no explicit id, derive key from type+message
      const key = opts.id || `${safeType}:${String(message || '').trim()}`;
      cleanupRecent();
      const now = Date.now();
      const last = recentRef.current.get(key);
      if (last && now - last < DEDUPE_WINDOW_MS) {
        // duplicate within window: ignore
        return id;
      }
      recentRef.current.set(key, now);

      const toast = {
        id,
        type: safeType,
        message: String(message || ''),
      };

      setToasts((prev) => {
        const next = [...prev, toast];
        // Cap the number of toasts to avoid covering UI
        if (next.length > MAX_TOASTS) {
          next.shift();
        }
        return next;
      });

      // Auto-dismiss without blocking UI
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [cleanupRecent, removeToast]
  );

  const value = React.useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => {
          const meta = TYPES[t.type] || TYPES.info;
          return (
            <div
              key={t.id}
              role={meta.ariaRole}
              className={cn('toast', meta.className)}
            >
              <div className="toast-icon" aria-hidden="true">{meta.icon}</div>
              <div className="toast-message">{t.message}</div>
              <button
                type="button"
                className="toast-close"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
