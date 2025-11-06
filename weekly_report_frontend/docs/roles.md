# Roles Management (Supabase)

This app supports simple roles: employee, manager, admin.

Roles are primarily stored in `auth.users.app_metadata.role`. Optionally, you can mirror the role into a public `profiles` table (with columns `user_id`, `email`, `role`) for convenient querying on the frontend (with proper RLS).

IMPORTANT: Never expose the Supabase SERVICE ROLE KEY in frontend code.

## Server-side scripts

### Dry-run connectivity (no writes)

Before running role updates, verify that your environment variables and credentials work using a non-destructive check:

- Ensure environment variables (server-side only):
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

- Run:
  npm run check-role-script

This command initializes the Supabase Admin client and performs a lightweight `auth.admin.listUsers` call with perPage=1. It does not modify any data. It reports:
- Success if credentials are valid and Supabase is reachable
- Clear error messages if env vars are missing or credentials are invalid

### setUserRole

Use the provided Node script to set a user's role via the Supabase Admin API.

Requirements:
- Environment variables (server-side only):
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

Create a local `.env` (do not commit) and set:
```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (service role key)
```

Run examples:
- By email:
  npm run set-role -- --email user@example.com --role manager

- By user ID:
  npm run set-role -- --user-id 12345678-90ab-cdef-1234-567890abcdef --role admin

- Also sync into public.profiles (if table exists and RLS allows):
  npm run set-role -- --email user@example.com --role employee --sync-profile

Notes:
- Allowed roles: employee, manager, admin
- The script updates `app_metadata.role`. If `--sync-profile` is used, it attempts to upsert `{ user_id, email, role }` into `public.profiles`. If that table is missing or RLS blocks it, the script will log a notice and continue.

## Frontend behavior

- The AuthContext derives role with this priority:
  1) `app_metadata.role` (source of truth)
  2) `user_metadata.role`
  3) Fallback: optional lookup from `public.profiles.role` for the current `user_id`
  4) Final fallback: email heuristics

- To enable the profiles lookup, your database should have a `public.profiles` table and an RLS policy allowing users to `SELECT` their own row:
  Example policy idea:
    - Enable RLS on `public.profiles`
    - Policy for SELECT to authenticated users: `using (auth.uid() = user_id)`

## Security guidance

- Never expose SERVICE ROLE KEYS client-side. Use `.env` files for local server-side scripts only.
- Commit a `.env.example` with placeholder names, not real values.
- Maintain RLS policies that restrict access appropriately:
  - App-only needs anon or authenticated keys in the frontend.
  - Admin operations are server-only; use the service role key only in secure environments.

