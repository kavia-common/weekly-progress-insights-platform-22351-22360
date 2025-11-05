import React from 'react';
import { getSupabase, getSupabaseConfigStatus } from '../lib/supabaseClient';
import ConfigWarning from '../components/ConfigWarning';

/**
 * PUBLIC_INTERFACE
 * NewReport renders the weekly report submission form.
 */
const NewReport = () => {
  const [accomplishments, setAccomplishments] = React.useState('');
  const [blockers, setBlockers] = React.useState('');
  const [nextPlan, setNextPlan] = React.useState('');
  const [status, setStatus] = React.useState(null);

  const supabase = getSupabase();
  const { isConfigured } = getSupabaseConfigStatus();

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('Submitting...');
    try {
      // Placeholder: In future, submit to backend or Supabase
      const payload = {
        accomplishments,
        blockers,
        next_week_plan: nextPlan,
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        // Example placeholder; not actually inserting to avoid external dependency
        console.log('Would send to Supabase or backend:', payload);
      } else {
        console.log('Supabase not configured. Local payload:', payload);
      }

      setStatus('Submitted (placeholder).');
      setAccomplishments('');
      setBlockers('');
      setNextPlan('');
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      console.error(err);
      setStatus('Error submitting (placeholder).');
    }
  };

  return (
    <div className="card">
      <div className="page-title">
        <h1>Submit Weekly Report</h1>
      </div>

      {!isConfigured && (
        <ConfigWarning message="Supabase configuration missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in your environment to enable data persistence." />
      )}

      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="accomplishments">Accomplishments</label>
          <textarea
            id="accomplishments"
            className="textarea"
            placeholder="What did you achieve this week?"
            value={accomplishments}
            onChange={(e) => setAccomplishments(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="blockers">Blockers</label>
          <textarea
            id="blockers"
            className="textarea"
            placeholder="Any impediments or challenges?"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="nextPlan">Next Week Plan</label>
          <textarea
            id="nextPlan"
            className="textarea"
            placeholder="What will you focus on next week?"
            value={nextPlan}
            onChange={(e) => setNextPlan(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" type="submit">
            Submit Report
          </button>
          {status && <span className="helper">{status}</span>}
        </div>
      </form>
    </div>
  );
};

export default NewReport;
