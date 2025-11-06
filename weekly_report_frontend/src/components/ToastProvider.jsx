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
 * ToastProvider - Provides a simple toast notification system.
 * Renders a container in the bottom-right with stacked toasts.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback((type, message, opts = {}) => {
    const id = opts.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = Number.isFinite(opts.duration) ? opts.duration : 3500;

    const toast = {
      id,
      type: TYPES[type] ? type : 'info',
      message,
    };
    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

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
