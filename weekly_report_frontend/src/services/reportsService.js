import { getSupabase } from '../lib/supabaseClient';

/**
 * PUBLIC_INTERFACE
 * createWeeklyReport inserts a weekly report record into the 'weekly_reports' table in Supabase.
 * It validates configuration presence and returns the inserted row on success.
 *
 * @param {Object} params - Report fields
 * @param {string} params.progress - Weekly accomplishments/progress (required)
 * @param {string} params.blockers - Blockers or challenges (optional)
 * @param {string} params.plans - Plan for next week (required)
 * @param {string} params.week_start - ISO date string (YYYY-MM-DD) representing the start of the week (required)
 * @param {string[]|string} [params.tags] - Tags as string[] or comma-separated string (optional)
 * @param {string} params.user_id - The authenticated user's UUID (required for RLS)
 * @returns {Promise<Object>} The inserted row
 * @throws {Error} If Supabase is not configured, session missing, validation fails, or insertion error occurs
 */
export async function createWeeklyReport({ progress, blockers, plans, week_start, tags, user_id }) {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY.');
  }

  // Basic validation
  if (!user_id) {
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

  const payload = {
    user_id,
    progress,
    blockers: blockers || null,
    plans,
    week_start, // Expecting 'YYYY-MM-DD'
    tags: tagsArray || [],
  };

  const { data, error } = await supabase
    .from('weekly_reports')
    .insert([payload])
    .select()
    .single();

  if (error) {
    // Surface database error to caller
    throw new Error(error.message || 'Failed to create weekly report.');
  }

  return data;
}
