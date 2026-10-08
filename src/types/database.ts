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

export type RunningProfile = {
  id: string;
  user_id: string;
  experience_level: ExperienceLevel;
  typical_run_minutes: number | null; // e.g. 30
  easy_pace: number | null; // min/mile e.g. 10.0
  fast_pace: number | null; // min/mile e.g. 7.5
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

// ── Constants ────────────────────────────────────────────────

export const FREE_TIER_AI_WORKOUTS = 5;
