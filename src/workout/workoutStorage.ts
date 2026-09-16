/**
 * Workout persistence layer using AsyncStorage.
 * No backend, no auth — everything stays on-device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WorkoutDefinition,
  WorkoutRepeatBlock,
  CompletedWorkout,
  AppSettings,
  DEFAULT_SETTINGS,
} from './workoutTypes';

const STORAGE_KEYS = {
  WORKOUTS: '@pacecue/workouts',
  HISTORY: '@pacecue/history',
  SETTINGS: '@pacecue/settings',
} as const;

// ── Migration ────────────────────────────────────────────────────────

/**
 * Migrate old single-interval warmup/cooldown to the new block-based format.
 * Old format: warmup: { type, durationSeconds, label? } | null
 * New format: warmup: WorkoutRepeatBlock[]
 */
function migrateWorkout(raw: any): WorkoutDefinition {
  if (raw.warmup && !Array.isArray(raw.warmup)) {
    // Old single-interval format → wrap in a block
    const interval = raw.warmup;
    raw.warmup = [
      { intervals: [interval], repeatCount: 1 },
    ] as WorkoutRepeatBlock[];
  } else if (!raw.warmup) {
    raw.warmup = [];
  }

  if (raw.cooldown && !Array.isArray(raw.cooldown)) {
    const interval = raw.cooldown;
    raw.cooldown = [
      { intervals: [interval], repeatCount: 1 },
    ] as WorkoutRepeatBlock[];
  } else if (!raw.cooldown) {
    raw.cooldown = [];
  }

  return raw as WorkoutDefinition;
}

// ── Workouts (CRUD) ──────────────────────────────────────────────────

export async function loadWorkouts(): Promise<WorkoutDefinition[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as any[];
  return parsed.map(migrateWorkout);
}

export async function saveWorkouts(
  workouts: WorkoutDefinition[]
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.WORKOUTS,
    JSON.stringify(workouts)
  );
}

export async function saveWorkout(
  workout: WorkoutDefinition
): Promise<void> {
  const existing = await loadWorkouts();
  const idx = existing.findIndex((w) => w.id === workout.id);
  if (idx >= 0) {
    existing[idx] = workout;
  } else {
    existing.push(workout);
  }
  await saveWorkouts(existing);
}

export async function deleteWorkout(id: string): Promise<void> {
  const existing = await loadWorkouts();
  await saveWorkouts(existing.filter((w) => w.id !== id));
}

// ── History ──────────────────────────────────────────────────────────

export async function loadHistory(): Promise<CompletedWorkout[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
  if (!raw) return [];
  return JSON.parse(raw) as CompletedWorkout[];
}

export async function saveCompletedWorkout(
  entry: CompletedWorkout
): Promise<void> {
  const history = await loadHistory();
  history.unshift(entry); // newest first
  // Keep last 200 entries
  if (history.length > 200) history.length = 200;
  await AsyncStorage.setItem(
    STORAGE_KEYS.HISTORY,
    JSON.stringify(history)
  );
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
}

// ── Settings ─────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.SETTINGS,
    JSON.stringify(settings)
  );
}
