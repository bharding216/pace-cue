/**
 * In-memory workout cache for passing plan workouts to the
 * run/edit screens without saving them to the local library.
 *
 * Plan-generated workouts live in Supabase `plan_workouts` — they
 * don't need to be duplicated into the on-device workout library.
 * This cache bridges the navigation gap: the plan detail screen
 * stashes the workout here, and the run/edit screen picks it up.
 */

import type { WorkoutDefinition } from './workoutTypes';

const cache = new Map<string, WorkoutDefinition>();

/** Stash a workout so the run/edit screen can retrieve it by ID. */
export function setTempWorkout(workout: WorkoutDefinition): void {
  cache.set(workout.id, workout);
}

/** Retrieve a cached workout (returns undefined if not cached). */
export function getTempWorkout(id: string): WorkoutDefinition | undefined {
  return cache.get(id);
}

/** Remove a workout from the cache once it's no longer needed. */
export function clearTempWorkout(id: string): void {
  cache.delete(id);
}
