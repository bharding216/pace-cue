-- Allow multiple active plans per user (previously limited to one).
-- Plans can cover different date ranges (e.g. a 5K plan and a half marathon plan).
drop index if exists idx_training_plans_one_active;
