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
-- These use security definer so they bypass RLS and return correct counts.

-- Total registered users
create or replace function total_users()
returns int as $$
  select count(*)::int from profiles;
$$ language sql security definer;

-- New users in the last N days
create or replace function new_users(num_days int default 7)
returns int as $$
  select count(*)::int
  from profiles
  where created_at > now() - (num_days || ' days')::interval;
$$ language sql security definer;

-- DAU: distinct anonymous users who opened the app today
create or replace function dau_today()
returns int as $$
  select count(distinct anonymous_user_id)::int
  from events
  where event_name = 'app_opened'
    and created_at::date = current_date;
$$ language sql security definer;

-- Active pro subscribers (active or trialing)
create or replace function pro_subscribers()
returns int as $$
  select count(*)::int
  from subscriptions
  where tier = 'pro' and status in ('active', 'trialing');
$$ language sql security definer;

-- AI generations in the last N days
create or replace function ai_generations_count(num_days int default 7)
returns int as $$
  select count(*)::int
  from ai_generations
  where created_at > now() - (num_days || ' days')::interval;
$$ language sql security definer;

-- WAU: distinct anonymous users who opened the app in the last 7 days
create or replace function wau()
returns int as $$
  select count(distinct anonymous_user_id)::int
  from events
  where event_name = 'app_opened'
    and created_at > now() - interval '7 days';
$$ language sql security definer;

-- Activation Rate: % of users signed up in last 30d who completed >= 1 workout
-- Uses cloud_history (requires auth) as the activation signal.
create or replace function activation_rate()
returns numeric as $$
  select
    case
      when count(*) = 0 then 0
      else round(
        count(*) filter (where exists (
          select 1 from cloud_history ch
          where ch.user_id = p.id and ch.deleted_at is null
        ))::numeric / count(*)::numeric * 100,
        1
      )
    end
  from profiles p
  where p.created_at > now() - interval '30 days';
$$ language sql security definer;

-- Week 4 Retention: % of users who signed up 22-28 days ago
-- that completed a workout in the last 7 days.
create or replace function week4_retention()
returns numeric as $$
  select
    case
      when count(*) = 0 then 0
      else round(
        count(*) filter (where exists (
          select 1 from cloud_history ch
          where ch.user_id = p.id
            and ch.deleted_at is null
            and ch.completed_at > now() - interval '7 days'
        ))::numeric / count(*)::numeric * 100,
        1
      )
    end
  from profiles p
  where p.created_at between now() - interval '28 days'
                        and now() - interval '21 days';
$$ language sql security definer;

-- Core Feature Engagement: % of WAU who started or completed a workout
create or replace function core_engagement_rate()
returns numeric as $$
  with wau_users as (
    select count(distinct anonymous_user_id) as total
    from events
    where event_name = 'app_opened'
      and created_at > now() - interval '7 days'
  ),
  engaged_users as (
    select count(distinct anonymous_user_id) as total
    from events
    where event_name in ('workout_started', 'workout_completed')
      and created_at > now() - interval '7 days'
  )
  select
    case
      when wau_users.total = 0 then 0
      else round(engaged_users.total::numeric / wau_users.total::numeric * 100, 1)
    end
  from wau_users, engaged_users;
$$ language sql security definer;

-- Free-to-Paid Conversion: % of all registered users who have a pro subscription
create or replace function free_to_paid_rate()
returns numeric as $$
  with total as (
    select count(*) as n from profiles
  ),
  paid as (
    select count(*) as n
    from subscriptions
    where tier = 'pro' and status in ('active', 'trialing')
  )
  select
    case
      when total.n = 0 then 0
      else round(paid.n::numeric / total.n::numeric * 100, 1)
    end
  from total, paid;
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
