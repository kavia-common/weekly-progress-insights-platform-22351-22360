#!/usr/bin/env node
/**
 * scripts/checkSupabaseAdminDryRun.js
 *
 * Non-destructive connectivity check for Supabase Admin API using the SERVICE ROLE KEY.
 * This script verifies that SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present and valid,
 * initializes a Supabase Admin client, and performs a lightweight listUsers call.
 *
 * IMPORTANT:
 * - This script must be executed server-side (Node.js), never in the browser.
 * - Do NOT expose the service role key in client code or commit real keys to version control.
 *
 * Usage:
 *   node scripts/checkSupabaseAdminDryRun.js
 *
 * Exit codes:
 *   0 - Success
 *   1 - Generic failure or unexpected error
 *   2 - Missing environment variables
 *   3 - Invalid credentials or unauthorized
 */

const { createClient } = require('@supabase/supabase-js');

function exitWith(code, message) {
  const prefix = '[checkSupabaseAdminDryRun]';
  if (code === 0) {
    // eslint-disable-next-line no-console
    console.log(`${prefix} SUCCESS: ${message}`);
  } else {
    // eslint-disable-next-line no-console
    console.error(`${prefix} ERROR: ${message}`);
  }
  process.exit(code);
}

(async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    exitWith(
      2,
      'Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. Please set them in your environment (server-side only).'
    );
  }

  // Initialize client with admin capabilities using service role key
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    // Perform a no-op admin call: list the first user (if any) without fetching more than 1
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (error) {
      const msg = String(error.message || 'Unknown error');
      // Detect invalid credentials/unauthorized scenarios
      if (/invalid|unauthorized|permission|apikey|service|key/i.test(msg)) {
        exitWith(
          3,
          `Credentials appear invalid or unauthorized for Admin API. Message: ${error.message}`
        );
      }
      exitWith(1, `Admin API call failed: ${error.message}`);
    }

    const count = Array.isArray(data?.users) ? data.users.length : 0;
    // eslint-disable-next-line no-console
    console.log('[checkSupabaseAdminDryRun] Diagnostic:', {
      url: SUPABASE_URL,
      usersPreviewCount: count,
    });

    exitWith(0, `Connected to Supabase Admin API successfully. Users preview count: ${count}`);
  } catch (e) {
    exitWith(1, e?.message || 'Unexpected error during connectivity check.');
  }
})();
