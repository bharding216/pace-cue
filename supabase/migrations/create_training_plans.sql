-- ── Training Plans ──────────────────────────────────────────

create table if not exists training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  race_type text not null check (race_type in ('5k', '10k', 'half_marathon', 'marathon', 'custom')),
  race_distance_meters numeric,
  race_date date not null,
  goal_time_minutes numeric,
  start_date date not null,
  days_per_week int not null check (days_per_week between 3 and 7),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table training_plans enable row level security;
create policy "Users own their training plans"
  on training_plans for all using (auth.uid() = user_id);

-- Only one active plan per user
create unique index idx_training_plans_one_active
  on training_plans (user_id) where (status = 'active');

-- ── Plan Workouts ───────────────────────────────────────────

create table if not exists plan_workouts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references training_plans on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  week_number int not null,
  day_label text,
  description text,
  workout_data jsonb,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  completed_workout_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table plan_workouts enable row level security;
create policy "Users own their plan workouts"
  on plan_workouts for all using (auth.uid() = user_id);

create index idx_plan_workouts_plan_date on plan_workouts (plan_id, date);
create index idx_plan_workouts_user_date on plan_workouts (user_id, date);

-- ── Add plan_id to ai_conversations ─────────────────────────

alter table ai_conversations
  add column if not exists plan_id uuid references training_plans on delete set null;
