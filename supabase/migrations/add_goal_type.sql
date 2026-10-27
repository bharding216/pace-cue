-- Add goal_type and goal_pace to training_plans.
-- goal_type: 'race' (default, backward compat) or 'pace_target' (hit a pace by a date).
-- goal_pace: target pace in min/mile (decimal), e.g. 8.5 = 8:30/mi. Nullable.

ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'race'
    CHECK (goal_type IN ('race', 'pace_target'));

ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS goal_pace numeric;
