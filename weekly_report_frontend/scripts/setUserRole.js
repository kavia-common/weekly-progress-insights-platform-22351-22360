#!/usr/bin/env node
/**
 * scripts/setUserRole.js
 *
 * Secure role management script for Supabase Admin API.
 *
 * This script sets a user's application role in auth.users app_metadata.role using the SERVICE_ROLE_KEY.
 * Optionally, it can also upsert into a public "profiles" table with { user_id, email, role }.
 *
 * IMPORTANT:
 * - This script must be executed server-side (Node.js), never in the browser.
 * - Do NOT expose the service role key in client code or commit real keys to version control.
 *
 * Usage:
 *   node scripts/setUserRole.js --email user@example.com --role manager
 *   node scripts/setUserRole.js --user-id 12345678-90ab-cdef-1234-567890abcdef --role admin
 *   node scripts/setUserRole.js --email user@example.com --role employee --sync-profile
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

// Simple CLI args parser (no external deps)
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true; // flags like --sync-profile
      }
    }
  }
  return args;
}

function exitWithError(message, code = 1) {
  // eslint-disable-next-line no-console
  console.error(`[setUserRole] ERROR: ${message}`);
  process.exit(code);
}

function logInfo(message, ...rest) {
  // eslint-disable-next-line no-console
  console.log(`[setUserRole] ${message}`, ...rest);
}

async function main() {
  const args = parseArgs(process.argv);

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    exitWithError(
      'Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. Please set them in your environment (server-side only).'
    );
  }

  const roleInput = (args.role || '').toString().trim().toLowerCase();
  const allowedRoles = ['employee', 'manager', 'admin'];

  if (!roleInput || !allowedRoles.includes(roleInput)) {
    exitWithError(
      `Invalid or missing --role. Allowed values: ${allowedRoles.join(', ')}`
    );
  }

  const email = args.email ? String(args.email).trim() : null;
  const userId = args['user-id'] ? String(args['user-id']).trim() : null;
  const syncProfile = Boolean(args['sync-profile']) || false;

  if (!email && !userId) {
    exitWithError('Provide either --email or --user-id to identify the user.');
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      // Admin operations require service key; no persist for Node script.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    // 1) Resolve user by email or use provided user ID
    let targetUserId = userId;

    if (!targetUserId && email) {
      logInfo(`Looking up user by email: ${email}`);
      const { data, error } = await supabase.auth.admin.listUsers({
        email,
      });

      if (error) {
        exitWithError(`Failed to list users by email: ${error.message}`);
      }

      const users = Array.isArray(data?.users) ? data.users : [];
      if (users.length === 0) {
        exitWithError(`No user found with email: ${email}`);
      }
      if (users.length > 1) {
        logInfo(
          `Multiple users found for ${email}. Using the first match (id=${users[0].id}).`
        );
      }
      targetUserId = users[0].id;
    }

    if (!targetUserId) {
      exitWithError('Could not resolve a target user id.');
    }

    // 2) Update app_metadata.role via Admin API
    logInfo(
      `Updating app_metadata.role for user_id=${targetUserId} to role="${roleInput}"...`
    );
    const { data: updated, error: updateErr } =
      await supabase.auth.admin.updateUserById(targetUserId, {
        app_metadata: { role: roleInput },
      });

    if (updateErr) {
      exitWithError(`Failed to update user app_metadata.role: ${updateErr.message}`);
    }

    // 3) Optionally sync to public.profiles (user_id, email, role)
    if (syncProfile) {
      try {
        const emailToUse =
          email || (updated?.user?.email ? String(updated.user.email) : null);

        if (!emailToUse) {
          logInfo(
            'Could not resolve email for profiles sync; proceeding with user_id and role only.'
          );
        }

        logInfo('Attempting to upsert into public.profiles (if table exists)...');
        const payload = {
          user_id: targetUserId,
          role: roleInput,
          ...(emailToUse ? { email: emailToUse } : {}),
        };

        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert([payload], { onConflict: 'user_id' });

        if (upsertErr) {
          logInfo(
            `profiles upsert failed (table might not exist or RLS prevented operation): ${upsertErr.message}`
          );
        } else {
          logInfo('profiles upsert succeeded.');
        }
      } catch (syncErr) {
        logInfo(
          `profiles sync threw an exception (likely missing table or RLS): ${syncErr.message}`
        );
      }
    } else {
      logInfo(
        'Skipping profiles sync. Use --sync-profile to attempt upsert into public.profiles.'
      );
    }

    logInfo('Success! User role updated.', {
      user_id: targetUserId,
      role: roleInput,
      syncedProfiles: syncProfile,
    });
  } catch (e) {
    exitWithError(e?.message || 'Unexpected error running setUserRole.');
  }
}

main();
