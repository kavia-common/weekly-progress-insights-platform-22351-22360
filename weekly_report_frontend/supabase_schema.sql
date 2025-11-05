-- Supabase schema helper for the Weekly Report Platform
-- This file is documentation only. Do not execute automatically in CI.

-- Required environment variables for the frontend:
--   REACT_APP_SUPABASE_URL
--   REACT_APP_SUPABASE_KEY

-- Recommended table definition
-- Requires the pgcrypto extension for gen_random_uuid() (enable in SQL editor: CREATE EXTENSION IF NOT EXISTS pgcrypto;)
create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  progress text not null,
  blockers text null,
  plans text not null,
  week_start date not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Indexes (optional but recommended)
create index if not exists weekly_reports_user_week_idx on public.weekly_reports (user_id, week_start);
create index if not exists weekly_reports_created_at_idx on public.weekly_reports (created_at);

-- Enable Row Level Security (RLS)
alter table public.weekly_reports enable row level security;

-- Policies
-- 1) Allow authenticated users to insert their own reports
create policy if not exists "insert_own_reports"
on public.weekly_reports
for insert
to authenticated
with check (auth.uid() = user_id);

-- 2) Allow authenticated users to select their own reports
create policy if not exists "select_own_reports"
on public.weekly_reports
for select
to authenticated
using (auth.uid() = user_id);

-- 3) (Optional) Allow users to update their own reports on the same day of creation (example)
-- Adjust business rules as needed.
create policy if not exists "update_own_same_day"
on public.weekly_reports
for update
to authenticated
using (auth.uid() = user_id and created_at::date = now()::date)
with check (auth.uid() = user_id);

-- 4) (Optional) Admin access pattern:
-- Create a Postgres role (e.g., 'service_role_admin') and grant it select on the table without RLS restrictions,
-- or define a policy that allows members of a specific role to bypass restrictions.
-- Ensure service keys are not exposed in the frontend.

-- Notes:
-- - 'week_start' should correspond to the Monday of the reporting week.
-- - 'tags' is a free-form string array for categorization/search (e.g., ['frontend', 'release']).
-- - 'user_id' references Supabase auth.users and is used for RLS policies.
-- - The frontend uses Supabase auth; the client will insert 'user_id' as the authenticated user id.

-- Example insert (for reference; run in SQL editor while authenticated):
-- insert into public.weekly_reports (user_id, progress, blockers, plans, week_start, tags)
-- values (auth.uid(), 'Built login', 'Time constraints', 'Ship reporting UI', '2025-01-06', array['frontend','auth']);
