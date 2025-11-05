import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Admin shows feature flags and allows toggling in local state (no persistence).
 */
const Admin = () => {
  const flagsEnv = process.env.REACT_APP_FEATURE_FLAGS || '{}';
  let initialFlags = {};
  try {
    initialFlags = JSON.parse(flagsEnv);
  } catch (e) {
    initialFlags = {};
  }

  const [flags, setFlags] = React.useState(initialFlags);

  const toggleFlag = (key) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addFlag = () => {
    const name = prompt('New flag key (e.g., enableInsights):');
    if (name) {
      setFlags((prev) => ({ ...prev, [name]: false }));
    }
  };

  const keys = Object.keys(flags);

  return (
    <div className="card">
      <div className="page-title">
        <h1>Admin Settings</h1>
      </div>
      {keys.length === 0 ? (
        <p className="helper">No feature flags found. You can define REACT_APP_FEATURE_FLAGS as a JSON string, e.g. {"{\"enableInsights\": true}"}</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {keys.map((k) => (
            <label key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10 }}>
              <span>{k}</span>
              <input type="checkbox" checked={Boolean(flags[k])} onChange={() => toggleFlag(k)} />
            </label>
          ))}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button className="btn secondary" type="button" onClick={addFlag}>Add Flag</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="helper">Current flags (local state):</div>
        <pre className="card" style={{ overflow: 'auto' }}>{JSON.stringify(flags, null, 2)}</pre>
      </div>
    </div>
  );
};

export default Admin;
