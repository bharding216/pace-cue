-- Add new runner profile fields: fitness, availability, cross-training

alter table running_profiles
  add column if not exists weekly_mileage numeric,
  add column if not exists longest_recent_run_minutes int,
  add column if not exists max_workout_minutes int,
  add column if not exists preferred_days jsonb default '[]'::jsonb,
  add column if not exists cross_training jsonb default '[]'::jsonb;

-- Allow 'limitation' category on running_preferences
alter table running_preferences
  drop constraint if exists running_preferences_category_check;

alter table running_preferences
  add constraint running_preferences_category_check
  check (category in ('goal', 'preference', 'general', 'limitation'));
