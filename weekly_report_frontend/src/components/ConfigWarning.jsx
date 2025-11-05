import React from 'react';

/**
 * PUBLIC_INTERFACE
 * ConfigWarning displays a styled inline notice for missing configuration.
 */
const ConfigWarning = ({ message }) => {
  if (!message) return null;
  return (
    <div className="config-warning" role="alert" aria-live="polite">
      ⚠️ {message}
    </div>
  );
};

export default ConfigWarning;
