/**
 * Database types for PaceCue cloud features.
 *
 * These mirror the Supabase tables defined in SETUP.md.
 */

// ── Subscription ─────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'expired'
  | 'past_due';
export type SubscriptionProvider = 'apple' | 'stripe' | 'manual';

export type Subscription = {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: SubscriptionProvider | null;
  provider_subscription_id: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

// ── Profile ──────────────────────────────────────────────────

export type Profile = {
  id: string;
  display_name: string | null;
  ai_workouts_this_month: number;
  created_at: string;
  updated_at: string;
};

// ── Running Profile / Preferences ────────────────────────────

export type RunningPreferenceCategory =
  | 'goal'
  | 'preference'
  | 'general';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/** Per-distance benchmark: slow / avg / fast in total seconds. */
export type RaceTimeEntry = {
  slow: number | null;
  avg: number | null;
  fast: number | null;
};

/** Keys are distance identifiers: mile, 5k, 10k, half_marathon, marathon. */
export type RaceTimes = Record<string, RaceTimeEntry>;

export type RunningProfile = {
  id: string;
  user_id: string;
  experience_level: ExperienceLevel;
  typical_run_minutes: number | null; // e.g. 30 (range lower bound)
  typical_run_minutes_max: number | null; // e.g. 60 (range upper bound)
  easy_pace: number | null; // min/mile e.g. 10.0
  fast_pace: number | null; // min/mile e.g. 7.5
  race_times: RaceTimes | null;
  created_at: string;
  updated_at: string;
};

export type RunningPreference = {
  id: string;
  user_id: string;
  content: string;
  category: RunningPreferenceCategory;
  created_at: string;
};

// ── AI Generations ───────────────────────────────────────────

export type AIGeneration = {
  id: string;
  user_id: string;
  prompt: string;
  result: unknown | null;
  created_at: string;
};

// ── Training Plans ───────────────────────────────────────────

export type RaceType = '5k' | '10k' | 'half_marathon' | 'marathon' | 'custom';
export type PlanStatus = 'active' | 'completed' | 'archived';
export type PlanWorkoutStatus = 'planned' | 'completed' | 'skipped';

export type TrainingPlan = {
  id: string;
  user_id: string;
  title: string;
  race_type: RaceType;
  race_distance_meters: number | null;
  race_date: string; // ISO date string YYYY-MM-DD
  goal_time_minutes: number | null;
  start_date: string; // ISO date string YYYY-MM-DD
  days_per_week: number;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
};

export type PlanWorkout = {
  id: string;
  plan_id: string;
  user_id: string;
  date: string; // ISO date string YYYY-MM-DD
  week_number: number;
  day_label: string | null;
  description: string | null;
  workout_data: unknown | null; // WorkoutDefinition JSON when present
  status: PlanWorkoutStatus;
  completed_workout_id: string | null;
  created_at: string;
  updated_at: string;
};

// ── Constants ────────────────────────────────────────────────

export const FREE_TIER_AI_WORKOUTS = 5;
