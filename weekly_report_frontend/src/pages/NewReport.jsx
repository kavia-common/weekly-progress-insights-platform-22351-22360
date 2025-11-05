import React from 'react';
import { getSupabaseConfigStatus } from '../lib/supabaseClient';
import ConfigWarning from '../components/ConfigWarning';
import { useAuth } from '../context/AuthContext';
import { createWeeklyReport } from '../services/reportsService';

/**
 * PUBLIC_INTERFACE
 * NewReport renders the weekly report submission form and persists data to Supabase.
 */
const NewReport = () => {
  const [accomplishments, setAccomplishments] = React.useState('');
  const [blockers, setBlockers] = React.useState('');
  const [nextPlan, setNextPlan] = React.useState('');
  const [weekStart, setWeekStart] = React.useState('');
  const [tagsInput, setTagsInput] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const { isConfigured } = getSupabaseConfigStatus();
  const { user, loading: authLoading } = useAuth();

  // Compute Monday of current week as default week_start
  React.useEffect(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const diffToMonday = (day === 0 ? -6 : 1) - day; // Adjust so Monday is start
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const iso = monday.toISOString().slice(0, 10);
    setWeekStart(iso);
  }, []);

  const validate = () => {
    if (!accomplishments.trim()) {
      setErrorMsg('Please enter your accomplishments/progress.');
      return false;
    }
    if (!nextPlan.trim()) {
      setErrorMsg('Please enter your plan for next week.');
      return false;
    }
    if (!weekStart) {
      setErrorMsg('Please select the start date for the week.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setStatus(null);

    if (!validate()) return;

    if (!isConfigured) {
      setErrorMsg('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      return;
    }

    if (authLoading) {
      setStatus('Checking session...');
      return;
    }

    if (!user) {
      setErrorMsg('You must be signed in to submit a report.');
      return;
    }

    setSubmitting(true);
    setStatus('Submitting...');
    try {
      const inserted = await createWeeklyReport({
        progress: accomplishments.trim(),
        blockers: blockers.trim(),
        plans: nextPlan.trim(),
        week_start: weekStart, // 'YYYY-MM-DD'
        tags: tagsInput,
        user_id: user.id,
      });

      setSuccessMsg('Report submitted successfully.');
      setStatus(null);
      // Reset fields except week start
      setAccomplishments('');
      setBlockers('');
      setNextPlan('');
      setTagsInput('');

      // Auto-clear success message
      setTimeout(() => setSuccessMsg(null), 3000);

      // Optionally log or use the inserted row
      // eslint-disable-next-line no-console
      console.log('Inserted report:', inserted);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setErrorMsg(err?.message || 'Failed to submit report.');
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" aria-live="polite">
      <div className="page-title">
        <h1>Submit Weekly Report</h1>
      </div>

      {!isConfigured && (
        <ConfigWarning message="Supabase configuration missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in your environment to enable data persistence." />
      )}
      {isConfigured && !authLoading && !user && (
        <ConfigWarning message="You are not signed in. Please sign in to submit a report." />
      )}

      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="weekStart">Week Start</label>
          <input
            id="weekStart"
            type="date"
            className="textarea"
            style={{ minHeight: 'auto' }}
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            required
          />
          <div className="helper">Choose the Monday of the reporting week.</div>
        </div>

        <div className="form-group">
          <label htmlFor="accomplishments">Accomplishments</label>
          <textarea
            id="accomplishments"
            className="textarea"
            placeholder="What did you achieve this week?"
            value={accomplishments}
            onChange={(e) => setAccomplishments(e.target.value)}
            required
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
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma separated)</label>
          <input
            id="tags"
            type="text"
            className="textarea"
            style={{ minHeight: 'auto' }}
            placeholder="e.g., frontend, release, infra"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" type="submit" disabled={submitting || !isConfigured || !user}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          {status && <span className="helper">{status}</span>}
          {successMsg && <span className="helper" style={{ color: 'var(--secondary)' }}>{successMsg}</span>}
          {errorMsg && <span className="helper" style={{ color: 'var(--error)' }}>{errorMsg}</span>}
        </div>
      </form>
    </div>
  );
};

export default NewReport;
