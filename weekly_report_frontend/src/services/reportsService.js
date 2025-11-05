import { getSupabase } from '../lib/supabaseClient';
import { isAuthDisabled } from '../lib/featureFlags';

/**
 * PUBLIC_INTERFACE
 * createWeeklyReport inserts a weekly report record into the 'weekly_reports' table in Supabase.
 * It validates configuration presence and returns the inserted row on success.
 *
 * In Test Mode (REACT_APP_DISABLE_AUTH=true), this function allows inserting without a user_id.
 * If Supabase RLS prevents the insert, a descriptive error is thrown to guide local configuration.
 *
 * @param {Object} params - Report fields
 * @param {string} params.progress - Weekly accomplishments/progress (required)
 * @param {string} params.blockers - Blockers or challenges (optional)
 * @param {string} params.plans - Plan for next week (required)
 * @param {string} params.week_start - ISO date string (YYYY-MM-DD) representing the start of the week (required)
 * @param {string[]|string} [params.tags] - Tags as string[] or comma-separated string (optional)
 * @param {string|null} params.user_id - The authenticated user's UUID (required for RLS when auth is enabled)
 * @returns {Promise<Object>} The inserted row
 * @throws {Error} If Supabase is not configured, session missing (when auth enabled), validation fails, or insertion error occurs
 */
export async function createWeeklyReport({ progress, blockers, plans, week_start, tags, user_id }) {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
  }

  const authDisabled = isAuthDisabled();

  // Basic validation
  if (!authDisabled && !user_id) {
    throw new Error('Missing user session. Please sign in to submit a report.');
  }
  if (!progress || !plans) {
    throw new Error('Progress and Plans are required.');
  }
  if (!week_start) {
    throw new Error('Week start date is required.');
  }

  // Normalize tags: accept comma-separated string or array
  let tagsArray = null;
  if (Array.isArray(tags)) {
    tagsArray = tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof tags === 'string') {
    tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Build payload; in Test Mode, omit user_id if not provided to attempt insert as anon
  const payload = {
    progress,
    blockers: blockers || null,
    plans,
    week_start, // Expecting 'YYYY-MM-DD'
    tags: tagsArray || [],
    ...(user_id ? { user_id } : {}),
  };

  const { data, error } = await supabase
    .from('weekly_reports')
    .insert([payload])
    .select()
    .single();

  if (error) {
    // Detect common RLS/permission errors and surface a helpful message in Test Mode
    const msg = String(error.message || '').toLowerCase();
    const looksLikeRls =
      msg.includes('row-level security') ||
      msg.includes('rls') ||
      msg.includes('not authorized') ||
      msg.includes('permission denied') ||
      msg.includes('violates row-level security') ||
      msg.includes('new row violates');

    if (authDisabled && looksLikeRls) {
      throw new Error(
        'Insert blocked by Supabase Row Level Security. In Test Mode, allow anon inserts (e.g., create a permissive policy for the "anon" role to insert into public.weekly_reports) or sign in via magic-link auth. Tip: For local dev, you can temporarily disable RLS on public.weekly_reports. Original error: ' +
          (error.message || 'RLS denied insert')
      );
    }

    // Surface database error to caller otherwise
    throw new Error(error.message || 'Failed to create weekly report.');
  }

  return data;
}
