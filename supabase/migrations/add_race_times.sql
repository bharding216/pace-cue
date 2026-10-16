-- Add race_times JSONB column to running_profiles
-- Stores benchmark times per distance with slow/avg/fast entries.
-- Example: { "mile": { "slow": 570, "avg": 480, "fast": 420 }, "5k": { ... } }
-- Values are stored as total seconds.

alter table running_profiles
  add column if not exists race_times jsonb default '{}'::jsonb;

-- Add typical_run_minutes_max to support a duration range (e.g. 30-60 min).
-- The existing typical_run_minutes becomes the lower bound.

alter table running_profiles
  add column if not exists typical_run_minutes_max int;
