/**
 * Training plan service — client-side API for generating plans,
 * adjusting them via AI chat, and CRUD operations against Supabase.
 */

import { supabase } from '../analytics/supabaseClient';
import { generateId } from '../workout/workoutTypes';
import type { TrainingPlan, PlanWorkout, RaceType } from '../types/database';
import type { AIContext } from './aiWorkoutService';
import { serializeHistorySummary } from './historySummary';

// ── Types ────────────────────────────────────────────────────

export interface PlanGenerationInput {
  profile: {
    experience_level?: string;
    typical_run_minutes?: number;
    typical_run_minutes_max?: number;
    easy_pace?: number;
    fast_pace?: number;
    race_times?: Record<string, { slow: number | null; avg: number | null; fast: number | null }> | null;
  };
  goals: string[];
  preferences: string[];
  raceType: RaceType;
  raceDate: string;
  goalTimeMinutes?: number | null;
  startDate: string;
  daysPerWeek: number;
  historySummary?: string | null;
}

export interface PlanGenerationResult {
  title: string;
  weeks: PlanWeekResult[];
}

export interface PlanWeekResult {
  week_number: number;
  theme: string;
  workouts: PlanWorkoutResult[];
}

export interface PlanWorkoutResult {
  date: string;
  day_label: string;
  description: string;
  workout: {
    name: string;
    warmup: unknown[];
    blocks: unknown[];
    cooldown: unknown[];
  } | null;
}

export interface PlanAdjustmentResult {
  message: string;
  modifications: PlanModification[];
}

export interface PlanModification {
  date: string;
  action: 'update' | 'skip';
  day_label?: string;
  description?: string;
  workout?: {
    name: string;
    warmup: unknown[];
    blocks: unknown[];
    cooldown: unknown[];
  } | null;
}

// ── Plan Generation ─────────────────────────────────────────

export async function generatePlan(input: PlanGenerationInput): Promise<PlanGenerationResult> {
  const { data, error } = await supabase.functions.invoke('generate-plan', {
    body: {
      profile: {
        experience_level: input.profile.experience_level,
        typical_run_minutes: input.profile.typical_run_minutes,
        typical_run_minutes_max: input.profile.typical_run_minutes_max,
        easy_pace: input.profile.easy_pace,
        fast_pace: input.profile.fast_pace,
        race_times: input.profile.race_times,
      },
      goals: input.goals,
      preferences: input.preferences,
      race_type: input.raceType,
      race_date: input.raceDate,
      goal_time_minutes: input.goalTimeMinutes,
      start_date: input.startDate,
      days_per_week: input.daysPerWeek,
      history_summary: input.historySummary,
    },
  });

  if (error) {
    const body = error.context
      ? await error.context.json().catch(() => null)
      : null;
    throw new Error(body?.error || error.message || 'Failed to generate plan');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as PlanGenerationResult;
}

// ── Plan Adjustment ─────────────────────────────────────────

export interface PlanAdjustmentInput {
  prompt: string;
  planSummary: {
    title: string;
    raceType: string;
    raceDate: string;
    startDate: string;
    daysPerWeek: number;
    totalWeeks: number;
    workouts: {
      date: string;
      day_label: string;
      status: string;
      week_number: number;
    }[];
  };
  profile?: {
    experience_level?: string;
    typical_run_minutes?: number;
    typical_run_minutes_max?: number;
    easy_pace?: number;
    fast_pace?: number;
    race_times?: Record<string, { slow: number | null; avg: number | null; fast: number | null }> | null;
  };
  conversation?: { role: 'user' | 'assistant'; content: string }[];
}

export async function adjustPlan(input: PlanAdjustmentInput): Promise<PlanAdjustmentResult> {
  const { data, error } = await supabase.functions.invoke('adjust-plan', {
    body: {
      prompt: input.prompt,
      plan_summary: {
        title: input.planSummary.title,
        race_type: input.planSummary.raceType,
        race_date: input.planSummary.raceDate,
        start_date: input.planSummary.startDate,
        days_per_week: input.planSummary.daysPerWeek,
        total_weeks: input.planSummary.totalWeeks,
        workouts: input.planSummary.workouts,
      },
      profile: input.profile,
      conversation: input.conversation,
    },
  });

  if (error) {
    const body = error.context
      ? await error.context.json().catch(() => null)
      : null;
    throw new Error(body?.error || error.message || 'Failed to adjust plan');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as PlanAdjustmentResult;
}

// ── CRUD Operations ─────────────────────────────────────────

/** Save a newly generated plan and its workouts to Supabase. */
export async function savePlan(
  userId: string,
  input: PlanGenerationInput,
  result: PlanGenerationResult,
): Promise<{ plan: TrainingPlan; workouts: PlanWorkout[] }> {
  // Archive any existing active plan
  await supabase
    .from('training_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  // Insert the plan
  const { data: planData, error: planError } = await supabase
    .from('training_plans')
    .insert({
      user_id: userId,
      title: result.title,
      race_type: input.raceType,
      race_distance_meters: input.raceType === 'custom' ? null : getRaceDistanceMeters(input.raceType),
      race_date: input.raceDate,
      goal_time_minutes: input.goalTimeMinutes ?? null,
      start_date: input.startDate,
      days_per_week: input.daysPerWeek,
      status: 'active',
    })
    .select()
    .single();

  if (planError || !planData) {
    throw new Error(planError?.message || 'Failed to save plan');
  }

  // Flatten all workouts from weeks and insert them
  const workoutRows = result.weeks.flatMap((week) =>
    week.workouts.map((w) => {
      const workoutData = w.workout
        ? {
            id: generateId(),
            name: w.workout.name,
            warmup: w.workout.warmup ?? [],
            blocks: w.workout.blocks ?? [],
            cooldown: w.workout.cooldown ?? [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        : null;

      return {
        plan_id: planData.id,
        user_id: userId,
        date: w.date,
        week_number: week.week_number,
        day_label: w.day_label,
        description: w.description,
        workout_data: workoutData,
        status: 'planned' as const,
      };
    })
  );

  const { data: workoutData, error: workoutError } = await supabase
    .from('plan_workouts')
    .insert(workoutRows)
    .select();

  if (workoutError) {
    throw new Error(workoutError.message);
  }

  return {
    plan: planData as TrainingPlan,
    workouts: (workoutData ?? []) as PlanWorkout[],
  };
}

/** Load the user's active training plan. */
export async function loadActivePlan(userId: string): Promise<TrainingPlan | null> {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.warn('Failed to load active plan:', error);
    return null;
  }

  return data as TrainingPlan | null;
}

/** Load all workouts for a given plan. */
export async function loadPlanWorkouts(planId: string): Promise<PlanWorkout[]> {
  const { data, error } = await supabase
    .from('plan_workouts')
    .select('*')
    .eq('plan_id', planId)
    .order('date');

  if (error) {
    console.warn('Failed to load plan workouts:', error);
    return [];
  }

  return (data ?? []) as PlanWorkout[];
}

/** Load plan workouts within a date range (for calendar views). */
export async function loadPlanWorkoutsInRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<PlanWorkout[]> {
  const { data, error } = await supabase
    .from('plan_workouts')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) {
    console.warn('Failed to load plan workouts in range:', error);
    return [];
  }

  return (data ?? []) as PlanWorkout[];
}

/** Mark a plan workout as completed and link to the completed workout. */
export async function completePlanWorkout(
  workoutId: string,
  completedWorkoutId: string,
): Promise<void> {
  const { error } = await supabase
    .from('plan_workouts')
    .update({
      status: 'completed',
      completed_workout_id: completedWorkoutId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workoutId);

  if (error) {
    console.warn('Failed to complete plan workout:', error);
  }
}

/** Mark a plan workout as skipped. */
export async function skipPlanWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('plan_workouts')
    .update({
      status: 'skipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workoutId);

  if (error) {
    console.warn('Failed to skip plan workout:', error);
  }
}

/** Apply modifications from the adjust-plan edge function. */
export async function applyPlanModifications(
  planId: string,
  modifications: PlanModification[],
): Promise<void> {
  for (const mod of modifications) {
    if (mod.action === 'skip') {
      // Mark as skipped by date
      await supabase
        .from('plan_workouts')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('plan_id', planId)
        .eq('date', mod.date);
    } else if (mod.action === 'update') {
      const workoutData = mod.workout
        ? {
            id: generateId(),
            name: mod.workout.name,
            warmup: mod.workout.warmup ?? [],
            blocks: mod.workout.blocks ?? [],
            cooldown: mod.workout.cooldown ?? [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        : null;

      await supabase
        .from('plan_workouts')
        .update({
          day_label: mod.day_label ?? undefined,
          description: mod.description ?? undefined,
          workout_data: workoutData,
          updated_at: new Date().toISOString(),
        })
        .eq('plan_id', planId)
        .eq('date', mod.date);
    }
  }
}

/** Add a custom workout to the plan calendar on a specific date. */
export async function addWorkoutToCalendar(
  planId: string,
  userId: string,
  date: string,
  workout: import('../workout/workoutTypes').WorkoutDefinition,
  startDate: string,
): Promise<PlanWorkout> {
  const start = new Date(startDate);
  const target = new Date(date);
  const diffMs = target.getTime() - start.getTime();
  const weekNumber = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));

  const { data, error } = await supabase
    .from('plan_workouts')
    .insert({
      plan_id: planId,
      user_id: userId,
      date,
      week_number: weekNumber,
      day_label: workout.name,
      description: 'Custom workout added to calendar',
      workout_data: {
        id: workout.id,
        name: workout.name,
        warmup: workout.warmup ?? [],
        blocks: workout.blocks ?? [],
        cooldown: workout.cooldown ?? [],
        targetDistanceMeters: workout.targetDistanceMeters ?? null,
        createdAt: workout.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      },
      status: 'planned' as const,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to add workout to calendar');
  }

  return data as PlanWorkout;
}

/** Archive (soft-delete) a plan. */
export async function archivePlan(planId: string): Promise<void> {
  const { error } = await supabase
    .from('training_plans')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId);

  if (error) {
    throw new Error(error.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getRaceDistanceMeters(raceType: RaceType): number | null {
  switch (raceType) {
    case '5k': return 5000;
    case '10k': return 10000;
    case 'half_marathon': return 21097;
    case 'marathon': return 42195;
    default: return null;
  }
}
