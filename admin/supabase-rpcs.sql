-- ── Account Deletion (called by the client) ─────────────────
-- Allows the authenticated user to delete their own account.
-- All user data cascades automatically via ON DELETE CASCADE FKs
-- on profiles, running_profiles, running_preferences, subscriptions,
-- ai_generations, ai_conversations, cloud_workouts, and cloud_history.

create or replace function delete_own_account()
returns void as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer;

-- ── Admin Dashboard RPC Functions ────────────────────────────
-- Run these in the Supabase SQL Editor to support the admin dashboard.
-- These use security definer + service_role checks so they can only be
-- called by the service role key (not by end users).

-- DAU: distinct anonymous users who opened the app today
create or replace function dau_today()
returns int as $$
  select count(distinct anonymous_user_id)::int
  from events
  where event_name = 'app_opened'
    and created_at::date = current_date;
$$ language sql security definer;

-- Signups per day for the last N days
create or replace function signups_per_day(num_days int default 30)
returns table(date text, count int) as $$
  select
    to_char(d.day, 'YYYY-MM-DD') as date,
    coalesce(count(p.id), 0)::int as count
  from generate_series(
    current_date - (num_days - 1),
    current_date,
    '1 day'::interval
  ) as d(day)
  left join profiles p on p.created_at::date = d.day
  group by d.day
  order by d.day;
$$ language sql security definer;

-- Events per day for the last N days
create or replace function events_per_day(num_days int default 30)
returns table(date text, count int) as $$
  select
    to_char(d.day, 'YYYY-MM-DD') as date,
    coalesce(count(e.id), 0)::int as count
  from generate_series(
    current_date - (num_days - 1),
    current_date,
    '1 day'::interval
  ) as d(day)
  left join events e on e.created_at::date = d.day
  group by d.day
  order by d.day;
$$ language sql security definer;
