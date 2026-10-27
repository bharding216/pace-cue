-- Device region (ISO 3166-1 alpha-2) recorded with each analytics event.

alter table events add column if not exists country text;

-- Unique devices by country over the last N days.
-- Uses the latest app_opened country so each device is counted once.
create or replace function users_by_country(num_days int default 30)
returns table(country text, user_count int) as $$
  with latest as (
    select distinct on (anonymous_user_id)
      anonymous_user_id,
      country
    from events
    where event_name = 'app_opened'
      and created_at > now() - (num_days || ' days')::interval
    order by anonymous_user_id, created_at desc
  )
  select
    coalesce(nullif(country, ''), 'unknown') as country,
    count(*)::int as user_count
  from latest
  group by 1
  order by user_count desc, country;
$$ language sql security definer;
