import React from 'react';
import { getSupabaseConfigStatus } from '../lib/supabaseClient';
import ConfigWarning from '../components/ConfigWarning';
import { useAuth } from '../context/AuthContext';
import { createWeeklyReport } from '../services/reportsService';
import { useToast } from '../components/ToastProvider';
import { cn } from '../utils/cn';
import { isAuthDisabled } from '../lib/featureFlags';

/**
 * PUBLIC_INTERFACE
 * NewReport renders the weekly report submission form and persists data to Supabase.
 * In Test Mode (REACT_APP_DISABLE_AUTH=true), the form allows submissions without requiring an authenticated session.
 * If RLS prevents inserts without a user, the app surfaces a clear guidance message via toast.
 */
const NewReport = () => {
  const [accomplishments, setAccomplishments] = React.useState('');
  const [blockers, setBlockers] = React.useState('');
  const [nextPlan, setNextPlan] = React.useState('');
  const [weekStart, setWeekStart] = React.useState('');
  const [tagsInput, setTagsInput] = React.useState('');

  const [status, setStatus] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [errors, setErrors] = React.useState({}); // { fieldName: 'message' }

  const { isConfigured } = getSupabaseConfigStatus();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const authDisabled = isAuthDisabled();

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

  const hasRequiredContent = React.useCallback(() => {
    const minLen = 10;
    const acc = accomplishments.trim();
    const plan = nextPlan.trim();
    return Boolean(weekStart && acc && plan && acc.length >= minLen && plan.length >= minLen);
  }, [weekStart, accomplishments, nextPlan]);

  const validate = () => {
    const nextErrors = {};
    const minLen = 10;

    if (!weekStart) {
      nextErrors.weekStart = 'Please select the start date for the week.';
    }
    const acc = accomplishments.trim();
    if (!acc) {
      nextErrors.accomplishments = 'Please enter your accomplishments/progress.';
    } else if (acc.length < minLen) {
      nextErrors.accomplishments = `Please provide at least ${minLen} characters.`;
    }

    const plan = nextPlan.trim();
    if (!plan) {
      nextErrors.nextPlan = 'Please enter your plan for next week.';
    } else if (plan.length < minLen) {
      nextErrors.nextPlan = `Please provide at least ${minLen} characters.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!validate()) {
      addToast('error', 'Please fix the errors in the form.');
      return;
    }

    // Only enforce Supabase configuration in authenticated mode; in Test Mode we attempt submission regardless.
    if (!authDisabled && !isConfigured) {
      addToast('error', 'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
      return;
    }

    // If auth is enabled, respect loading state; otherwise bypass session checks
    if (!authDisabled && authLoading) {
      setStatus('Checking session...');
      return;
    }

    if (!authDisabled && !user) {
      addToast('error', 'You must be signed in to submit a report.');
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
        // In Test Mode allow user_id to be null/undefined; the service will handle RLS errors gracefully
        user_id: user?.id || null,
      });

      setStatus(null);
      // Reset fields except week start
      setAccomplishments('');
      setBlockers('');
      setNextPlan('');
      setTagsInput('');
      setErrors({});

      addToast('success', 'Report submitted successfully.');

      // eslint-disable-next-line no-console
      console.log('Inserted report:', inserted);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      addToast('error', err?.message || 'Failed to submit report.');
      setStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  // In Test Mode (auth disabled), ignore isConfigured and user checks; disable only on submitting or invalid content.
  const disableSubmit = authDisabled
    ? submitting || !hasRequiredContent()
    : submitting || !isConfigured || !user;

  return (
    <div className="card" aria-live="polite">
      <div className="page-title">
        <h1>Submit Weekly Report</h1>
      </div>

      {!isConfigured && (
        <ConfigWarning message="Supabase configuration missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in your environment to enable data persistence." />
      )}

      {/* Test Mode guidance */}
      {authDisabled && isConfigured && (
        <div className="test-mode-banner">
          <ConfigWarning message="Submissions are allowed without login; if insert fails, adjust RLS policies for anon or temporarily disable RLS for weekly_reports in dev." />
        </div>
      )}

      {isConfigured && !authLoading && !user && !authDisabled && (
        <ConfigWarning message="You are not signed in. Please sign in to submit a report." />
      )}

      <form onSubmit={onSubmit} className="form-grid" noValidate>
        <div className="form-group">
          <label htmlFor="weekStart">Week Start</label>
          <input
            id="weekStart"
            type="date"
            className={cn('textarea', { invalid: Boolean(errors.weekStart) })}
            style={{ minHeight: 'auto' }}
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            aria-invalid={Boolean(errors.weekStart)}
            aria-describedby={errors.weekStart ? 'weekStart-error' : undefined}
            required
          />
          <div className="helper">Choose the Monday of the reporting week.</div>
          {errors.weekStart && (
            <div id="weekStart-error" className="field-error" role="alert">
              {errors.weekStart}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="accomplishments">Accomplishments</label>
          <textarea
            id="accomplishments"
            className={cn('textarea', { invalid: Boolean(errors.accomplishments) })}
            placeholder="What did you achieve this week?"
            value={accomplishments}
            onChange={(e) => setAccomplishments(e.target.value)}
            aria-invalid={Boolean(errors.accomplishments)}
            aria-describedby={errors.accomplishments ? 'accomplishments-error' : undefined}
            minLength={10}
            required
          />
          {errors.accomplishments && (
            <div id="accomplishments-error" className="field-error" role="alert">
              {errors.accomplishments}
            </div>
          )}
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
            className={cn('textarea', { invalid: Boolean(errors.nextPlan) })}
            placeholder="What will you focus on next week?"
            value={nextPlan}
            onChange={(e) => setNextPlan(e.target.value)}
            aria-invalid={Boolean(errors.nextPlan)}
            aria-describedby={errors.nextPlan ? 'nextPlan-error' : undefined}
            minLength={10}
            required
          />
          {errors.nextPlan && (
            <div id="nextPlan-error" className="field-error" role="alert">
              {errors.nextPlan}
            </div>
          )}
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
          <button
            className="btn"
            type="submit"
            disabled={disableSubmit}
            aria-busy={submitting ? 'true' : 'false'}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          {authDisabled && (
            <span className="helper" title="Submitting without authentication">
              Test Mode: submitting without auth
            </span>
          )}
          {status && <span className="helper">{status}</span>}
        </div>
      </form>
    </div>
  );
};

export default NewReport;
