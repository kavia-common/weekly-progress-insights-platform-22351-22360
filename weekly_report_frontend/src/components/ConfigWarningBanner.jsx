import React from 'react';
import { cn } from '../utils/cn';

/**
 * PUBLIC_INTERFACE
 * ConfigWarningBanner
 * A non-intrusive, app-wide banner that detects missing critical runtime configuration
 * and displays actionable guidance. It supports dismissing for the session (using localStorage)
 * and reappears if the set of missing variables changes.
 *
 * Critical variables:
 * - REACT_APP_SUPABASE_URL
 * - REACT_APP_SUPABASE_KEY
 * - REACT_APP_API_BASE (or use REACT_APP_BACKEND_URL via api client; here we check API_BASE)
 *
 * Optional (production recommendation):
 * - REACT_APP_FRONTEND_URL (warn in production if missing)
 */
const ConfigWarningBanner = () => {
  // Compute missing env vars
  const criticalVars = [
    { key: 'REACT_APP_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'REACT_APP_SUPABASE_KEY', label: 'Supabase Anon Key' },
    { key: 'REACT_APP_API_BASE', label: 'Backend API Base' },
  ];

  const isProd = String(process.env.NODE_ENV).toLowerCase() === 'production';
  const optionalProdVars = [
    { key: 'REACT_APP_FRONTEND_URL', label: 'Frontend URL (recommended in production)' },
  ];

  const missingCritical = criticalVars
    .filter(v => !String(process.env[v.key] || '').trim())
    .map(v => v.key);

  const missingOptional = isProd
    ? optionalProdVars.filter(v => !String(process.env[v.key] || '').trim()).map(v => v.key)
    : [];

  // If nothing to report, hide
  const hasIssues = missingCritical.length > 0 || missingOptional.length > 0;

  // Session-dismiss key signature changes when the set of issues changes
  const signature = React.useMemo(() => {
    const parts = [
      'v1',
      ...missingCritical.sort(),
      ...(isProd ? missingOptional.sort() : []),
      isProd ? 'prod' : 'dev',
    ];
    return parts.join('|');
  }, [missingCritical, missingOptional, isProd]);

  const LS_KEY = `wr.configWarning.dismissed:${signature}`;

  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    try {
      const val = localStorage.getItem(LS_KEY);
      setDismissed(val === '1');
    } catch {
      setDismissed(false);
    }
  }, [LS_KEY]);

  const onDismiss = () => {
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {
      // ignore storage errors (e.g., private mode)
    }
    setDismissed(true);
  };

  if (!hasIssues || dismissed) return null;

  // Build message lines
  const items = [];
  if (missingCritical.length > 0) {
    items.push(
      `Missing critical env vars: ${missingCritical.join(', ')}.`
    );
  }
  if (missingOptional.length > 0) {
    items.push(
      `Recommended for production: ${missingOptional.join(', ')}.`
    );
  }

  // Quick tips
  const tips = [
    'Set variables in your environment or .env file (do not commit secrets).',
    'For CRA/React, restart the dev server after changing .env.',
    'Ensure variables are prefixed with REACT_APP_ to be available in the browser.',
  ];

  return (
    <div
      className={cn('config-warning-banner')}
      role="status"
      aria-live="polite"
    >
      <div className="config-warning-content">
        <div className="config-warning-title">
          ⚠️ Runtime configuration incomplete
        </div>
        <ul className="config-warning-list">
          {items.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
        <div className="config-warning-tips">
          Quick tips:
          <ul>
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        className="config-warning-dismiss"
        onClick={onDismiss}
        title="Dismiss for this session"
        aria-label="Dismiss configuration warning for this session"
      >
        Dismiss
      </button>
    </div>
  );
};

export default ConfigWarningBanner;
