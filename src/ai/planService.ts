/**
 * Training plan service — client-side API for generating plans,
 * adjusting them via AI chat, and CRUD operations against Supabase.
 *
 * Plan generation uses a two-phase lazy approach:
 *   1. generatePlanOutline() — fast single-call outline (week themes + day labels, no workout objects)
 *   2. generateWorkoutDetails() — on-demand batch detail for N specific dates
 *
 * ensureUpcomingWorkoutsDetailed() auto-fills the next 3 upcoming workouts when called.
 */

import { supabase } from '../analytics/supabaseClient';
import { generateId } from '../workout/workoutTypes';
import type { TrainingPlan, PlanWorkout, PlanOutlineWeek, RaceType } from '../types/database';
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

/** Outline result — no workout objects, just week themes and day labels. */
export interface PlanOutlineResult {
  title: string;
  weeks: PlanOutlineWeek[];
}

/** Detail result — full workout objects for specific dates. */
export interface WorkoutDetailResult {
  workouts: {
    date: string;
    workout: {
      name: string;
      warmup: unknown[];
      blocks: unknown[];
      cooldown: unknown[];
    };
  }[];
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

// ── Supabase error helper ───────────────────────────────────

async function extractFunctionError(error: any, fallback: string): Promise<string> {
  try {
    if (error.context && typeof error.context.json === 'function') {
      const body = await error.context.json().catch(() => null);
      if (body?.error) return body.error;
    }
    if (error.message) return error.message;
  } catch {
    // ignore
  }
  return fallback;
}

// ── Phase 1: Plan Outline ───────────────────────────────────

export async function generatePlanOutline(input: PlanGenerationInput): Promise<PlanOutlineResult> {
  const { data, error } = await supabase.functions.invoke('generate-plan-outline', {
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
    throw new Error(await extractFunctionError(error, 'Failed to generate plan outline'));
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as PlanOutlineResult;
}

// ── Phase 2: On-demand Workout Detail ───────────────────────

/** Generate detailed workout objects for specific plan_workout rows. */
export async function generateWorkoutDetails(
  plan: TrainingPlan,
  workoutsToDetail: PlanWorkout[],
): Promise<void> {
  if (workoutsToDetail.length === 0) return;

  const outline = plan.outline ?? [];

  // Build the request payload with week context for each workout
  const workoutRequests = workoutsToDetail.map((pw) => {
    const week = outline.find((w) => w.week_number === pw.week_number);
    return {
      date: pw.date,
      day_label: pw.day_label ?? 'Training',
      description: pw.description,
      week_number: pw.week_number,
      week_theme: week?.theme ?? `Week ${pw.week_number}`,
      total_miles_target: week?.total_miles_target ?? null,
    };
  });

  const totalWeeks = outline.length || Math.max(...workoutsToDetail.map((w) => w.week_number), 1);

  const { data, error } = await supabase.functions.invoke('generate-workouts', {
    body: {
      profile: {
        experience_level: undefined, // will be filled from plan context below
      },
      race_type: plan.race_type,
      race_date: plan.race_date,
      goal_time_minutes: plan.goal_time_minutes,
      days_per_week: plan.days_per_week,
      total_weeks: totalWeeks,
      workouts: workoutRequests,
    },
  });

  if (error) {
    throw new Error(await extractFunctionError(error, 'Failed to generate workout details'));
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  const result = data as WorkoutDetailResult;

  // Patch each workout's workout_data in the database
  for (const detail of result.workouts) {
    const matchingPw = workoutsToDetail.find((pw) => pw.date === detail.date);
    if (!matchingPw || !detail.workout) continue;

    const workoutData = {
      id: generateId(),
      name: detail.workout.name,
      warmup: detail.workout.warmup ?? [],
      blocks: detail.workout.blocks ?? [],
      cooldown: detail.workout.cooldown ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await supabase
      .from('plan_workouts')
      .update({
        workout_data: workoutData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchingPw.id);
  }
}

/** Also accept profile context for richer detail generation. */
export async function generateWorkoutDetailsWithProfile(
  plan: TrainingPlan,
  workoutsToDetail: PlanWorkout[],
  profile?: PlanGenerationInput['profile'],
): Promise<void> {
  if (workoutsToDetail.length === 0) return;

  const outline = plan.outline ?? [];

  const workoutRequests = workoutsToDetail.map((pw) => {
    const week = outline.find((w) => w.week_number === pw.week_number);
    return {
      date: pw.date,
      day_label: pw.day_label ?? 'Training',
      description: pw.description,
      week_number: pw.week_number,
      week_theme: week?.theme ?? `Week ${pw.week_number}`,
      total_miles_target: week?.total_miles_target ?? null,
    };
  });

  const totalWeeks = outline.length || Math.max(...workoutsToDetail.map((w) => w.week_number), 1);

  const { data, error } = await supabase.functions.invoke('generate-workouts', {
    body: {
      profile: profile ? {
        experience_level: profile.experience_level,
        typical_run_minutes: profile.typical_run_minutes,
        typical_run_minutes_max: profile.typical_run_minutes_max,
        easy_pace: profile.easy_pace,
        fast_pace: profile.fast_pace,
        race_times: profile.race_times,
      } : undefined,
      race_type: plan.race_type,
      race_date: plan.race_date,
      goal_time_minutes: plan.goal_time_minutes,
      days_per_week: plan.days_per_week,
      total_weeks: totalWeeks,
      workouts: workoutRequests,
    },
  });

  if (error) {
    throw new Error(await extractFunctionError(error, 'Failed to generate workout details'));
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  const result = data as WorkoutDetailResult;

  for (const detail of result.workouts) {
    const matchingPw = workoutsToDetail.find((pw) => pw.date === detail.date);
    if (!matchingPw || !detail.workout) continue;

    const workoutData = {
      id: generateId(),
      name: detail.workout.name,
      warmup: detail.workout.warmup ?? [],
      blocks: detail.workout.blocks ?? [],
      cooldown: detail.workout.cooldown ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await supabase
      .from('plan_workouts')
      .update({
        workout_data: workoutData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchingPw.id);
  }
}

// ── Auto-fill upcoming workouts ─────────────────────────────

const UPCOMING_DETAIL_COUNT = 3;

/**
 * Checks whether the next N upcoming planned workouts have workout_data.
 * If not, generates details for them. Returns the updated workouts.
 * Safe to call repeatedly — no-ops if workouts already have detail.
 */
export async function ensureUpcomingWorkoutsDetailed(
  plan: TrainingPlan,
  allWorkouts: PlanWorkout[],
): Promise<PlanWorkout[]> {
  const today = new Date().toISOString().split('T')[0];

  // Find upcoming planned non-rest workouts without workout_data
  const needsDetail = allWorkouts
    .filter((w) =>
      w.status === 'planned' &&
      w.date >= today &&
      w.day_label !== 'Rest Day' &&
      !w.workout_data
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, UPCOMING_DETAIL_COUNT);

  if (needsDetail.length === 0) return allWorkouts;

  try {
    await generateWorkoutDetails(plan, needsDetail);

    // Re-fetch the updated workouts from the database
    const { data } = await supabase
      .from('plan_workouts')
      .select('*')
      .eq('plan_id', plan.id)
      .order('date');

    return (data ?? allWorkouts) as PlanWorkout[];
  } catch (err) {
    console.warn('Failed to auto-generate workout details:', err);
    return allWorkouts;
  }
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
    let message = 'Failed to adjust plan';
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json().catch(() => null);
        if (body?.error) message = body.error;
      } else if (error.message) {
        message = error.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as PlanAdjustmentResult;
}

// ── CRUD Operations ─────────────────────────────────────────

/**
 * Save a newly generated plan outline and its skeleton workouts to Supabase.
 * Workouts are saved WITHOUT workout_data — detail is generated on demand.
 */
export async function savePlanOutline(
  userId: string,
  input: PlanGenerationInput,
  result: PlanOutlineResult,
): Promise<{ plan: TrainingPlan; workouts: PlanWorkout[] }> {
  // Archive any existing active plan
  await supabase
    .from('training_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');

  // Insert the plan with outline stored for future detail generation context
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
      outline: result.weeks,
      status: 'active',
    })
    .select()
    .single();

  if (planError || !planData) {
    throw new Error(planError?.message || 'Failed to save plan');
  }

  // Flatten all days from outline weeks into plan_workout rows (no workout_data)
  const workoutRows = result.weeks.flatMap((week) =>
    week.days.map((day) => ({
      plan_id: planData.id,
      user_id: userId,
      date: day.date,
      week_number: week.week_number,
      day_label: day.day_label,
      description: day.description,
      workout_data: null,
      status: 'planned' as const,
    }))
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
