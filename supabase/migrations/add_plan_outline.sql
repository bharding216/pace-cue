-- Add outline column to training_plans for storing the week-level plan structure.
-- This stores week themes, volume targets, and day labels so the detail generator
-- has context when creating workouts on demand.

alter table training_plans
  add column if not exists outline jsonb;
