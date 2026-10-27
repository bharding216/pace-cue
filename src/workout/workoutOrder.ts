/**
 * Sort and custom order for workouts inside a category.
 *
 * Custom order is the relative order of workouts in the saved library.
 * Named sorts (name, date, length) are a per-category view preference.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WorkoutCategory,
  WorkoutDefinition,
  categorizeWorkout,
  totalWorkoutDistanceMeters,
  totalWorkoutSeconds,
} from './workoutTypes';

export const CATEGORY_SORT_STORAGE_KEY = '@pacecue/category_sort';

export type WorkoutSortMode =
  | 'custom'
  | 'name_asc'
  | 'name_desc'
  | 'newest'
  | 'oldest'
  | 'shortest'
  | 'longest';

export const WORKOUT_SORT_OPTIONS: readonly {
  mode: WorkoutSortMode;
  label: string;
  detail: string;
  short: string;
}[] = [
  { mode: 'custom', label: 'Custom', detail: 'Drag or use the arrows', short: 'Custom' },
  { mode: 'name_asc', label: 'Name A–Z', detail: 'Alphabetical', short: 'A–Z' },
  { mode: 'name_desc', label: 'Name Z–A', detail: 'Reverse alphabetical', short: 'Z–A' },
  { mode: 'newest', label: 'Newest', detail: 'Recently created first', short: 'Newest' },
  { mode: 'oldest', label: 'Oldest', detail: 'Earliest created first', short: 'Oldest' },
  { mode: 'shortest', label: 'Shortest', detail: 'Least time or distance first', short: 'Shortest' },
  { mode: 'longest', label: 'Longest', detail: 'Most time or distance first', short: 'Longest' },
];

const SORT_MODES = new Set<WorkoutSortMode>(WORKOUT_SORT_OPTIONS.map((option) => option.mode));

const CATEGORIES = new Set<WorkoutCategory>(['easy', 'tempo', 'intervals', 'long_run', 'race']);

export type CategorySortPrefs = Partial<Record<WorkoutCategory, WorkoutSortMode>>;

export async function loadCategorySortPrefs(): Promise<CategorySortPrefs> {
  try {
    const raw = await AsyncStorage.getItem(CATEGORY_SORT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const prefs: CategorySortPrefs = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!CATEGORIES.has(key as WorkoutCategory)) continue;
      if (typeof value !== 'string' || !SORT_MODES.has(value as WorkoutSortMode)) continue;
      prefs[key as WorkoutCategory] = value as WorkoutSortMode;
    }
    return prefs;
  } catch {
    return {};
  }
}

export async function saveCategorySortPref(
  category: WorkoutCategory,
  mode: WorkoutSortMode,
): Promise<void> {
  const current = await loadCategorySortPrefs();
  current[category] = mode;
  await AsyncStorage.setItem(CATEGORY_SORT_STORAGE_KEY, JSON.stringify(current));
}

/**
 * Length used for shortest/longest. Timed workouts use their duration.
 * Distance-only workouts are estimated at 6:00 per kilometer so they
 * sort among timed workouts instead of collapsing to zero.
 */
function lengthScore(workout: WorkoutDefinition): number {
  const seconds = totalWorkoutSeconds(workout);
  if (seconds > 0) return seconds;
  const meters = totalWorkoutDistanceMeters(workout) ?? 0;
  return (meters / 1000) * 360;
}

function compareNames(a: WorkoutDefinition, b: WorkoutDefinition): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
}

function tieBreak(a: WorkoutDefinition, b: WorkoutDefinition): number {
  const byName = compareNames(a, b);
  if (byName !== 0) return byName;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Return a new array ordered for display. Custom mode keeps the given order. */
export function orderWorkouts(
  items: readonly WorkoutDefinition[],
  mode: WorkoutSortMode,
): WorkoutDefinition[] {
  const copy = items.slice();
  if (mode === 'custom') return copy;

  copy.sort((a, b) => {
    let diff = 0;
    switch (mode) {
      case 'name_asc':
        diff = compareNames(a, b);
        break;
      case 'name_desc':
        diff = compareNames(b, a);
        break;
      case 'newest':
        diff = b.createdAt - a.createdAt;
        break;
      case 'oldest':
        diff = a.createdAt - b.createdAt;
        break;
      case 'shortest':
        diff = lengthScore(a) - lengthScore(b);
        break;
      case 'longest':
        diff = lengthScore(b) - lengthScore(a);
        break;
    }
    return diff === 0 ? tieBreak(a, b) : diff;
  });

  return copy;
}

/**
 * Replace the relative order of workouts in one category.
 * Other categories keep their positions. The reordered category is
 * written as a block where its first workout used to be.
 */
export function reorderCategory(
  all: readonly WorkoutDefinition[],
  category: WorkoutCategory,
  ordered: readonly WorkoutDefinition[],
): WorkoutDefinition[] {
  const orderedIds = new Set(ordered.map((workout) => workout.id));
  const result: WorkoutDefinition[] = [];
  let inserted = false;

  for (const workout of all) {
    const inThisReorder =
      categorizeWorkout(workout) === category && orderedIds.has(workout.id);
    if (inThisReorder) {
      if (!inserted) {
        result.push(...ordered);
        inserted = true;
      }
      continue;
    }
    result.push(workout);
  }

  if (!inserted) result.push(...ordered);
  return result;
}
