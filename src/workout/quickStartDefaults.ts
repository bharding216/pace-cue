/**
 * Factory defaults for Quick Start workout tiles.
 *
 * Each type returns a fresh WorkoutDefinition with a new id.
 * These are NOT saved to the library — they serve as starting
 * configurations for session-only runs.
 *
 * Last-used defaults are managed via AsyncStorage in a separate
 * key so they don't pollute the workout library.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutDefinition, generateId, type QuickStartType } from './workoutTypes';

const DEFAULTS_KEY = '@pacecue/quick_start_defaults';

/** Build a factory-fresh WorkoutDefinition for a Quick Start type. */
function factoryDefault(type: QuickStartType): WorkoutDefinition {
  const now = Date.now();
  const base = { id: generateId(), createdAt: now, updatedAt: now };

  switch (type) {
    case 'distance':
      return {
        ...base,
        name: 'Distance Run',
        category: 'easy',
        warmup: [],
        blocks: [
          {
            intervals: [{ type: 'easy', durationSeconds: 0, distanceMeters: 4828, label: 'Easy Run' }],
            repeatCount: 1,
          },
        ],
        cooldown: [],
        targetDistanceMeters: 4828, // 3 miles
      };

    case 'timed':
      return {
        ...base,
        name: 'Timed Run',
        category: 'easy',
        warmup: [],
        blocks: [
          {
            intervals: [{ type: 'easy', durationSeconds: 1800, label: 'Run' }],
            repeatCount: 1,
          },
        ],
        cooldown: [],
      };

    case 'intervals':
      return {
        ...base,
        name: 'Intervals',
        category: 'intervals',
        warmup: [
          { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
        ],
        blocks: [
          {
            intervals: [
              { type: 'hard', durationSeconds: 180, label: 'Hard' },
              { type: 'easy', durationSeconds: 120, label: 'Easy' },
            ],
            repeatCount: 6,
          },
        ],
        cooldown: [
          { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
        ],
      };

    case 'tempo':
      return {
        ...base,
        name: 'Tempo Run',
        category: 'tempo',
        warmup: [
          { intervals: [{ type: 'warmup', durationSeconds: 480 }], repeatCount: 1 },
        ],
        blocks: [
          {
            intervals: [{ type: 'hard', durationSeconds: 1200, label: 'Tempo' }],
            repeatCount: 1,
          },
        ],
        cooldown: [
          { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
        ],
      };

    case 'easy_run':
      return {
        ...base,
        name: 'Easy Run',
        category: 'easy',
        warmup: [],
        blocks: [
          {
            intervals: [{ type: 'easy', durationSeconds: 1800, label: 'Easy Run' }],
            repeatCount: 1,
          },
        ],
        cooldown: [],
      };

    case 'custom':
    default:
      return {
        ...base,
        name: '',
        warmup: [
          { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
        ],
        blocks: [
          {
            intervals: [
              { type: 'hard', durationSeconds: 180 },
              { type: 'easy', durationSeconds: 120 },
            ],
            repeatCount: 4,
          },
        ],
        cooldown: [
          { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
        ],
      };
  }
}

/**
 * Return a workout draft for a Quick Start type.
 * Uses the last-used configuration for this type if available,
 * otherwise the factory default.
 */
export function quickStartFactory(type: QuickStartType): WorkoutDefinition {
  // Synchronous factory; last-used defaults loaded asynchronously below
  return factoryDefault(type);
}

/**
 * Load the last-used default for a Quick Start type.
 * Returns undefined if no previous configuration has been saved.
 */
export async function loadQuickStartDefault(type: QuickStartType): Promise<WorkoutDefinition | undefined> {
  const raw = await AsyncStorage.getItem(DEFAULTS_KEY);
  if (!raw) return undefined;
  try {
    const map: Record<string, WorkoutDefinition> = JSON.parse(raw);
    const saved = map[type];
    if (!saved) return undefined;
    return { ...saved, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
  } catch {
    return undefined;
  }
}

/** Persist the configuration as the last-used default for a Quick Start type. */
export async function saveQuickStartDefault(type: QuickStartType, workout: WorkoutDefinition): Promise<void> {
  const raw = await AsyncStorage.getItem(DEFAULTS_KEY);
  let map: Record<string, WorkoutDefinition> = {};
  if (raw) {
    try { map = JSON.parse(raw); } catch {}
  }
  map[type] = workout;
  await AsyncStorage.setItem(DEFAULTS_KEY, JSON.stringify(map));
}

/** All Quick Start tile definitions for the home screen. */
export const QUICK_START_TILES: { type: QuickStartType; label: string; icon: string; color: string }[] = [
  { type: 'distance', label: 'Distance', icon: 'navigate-outline', color: '#4ADE80' },
  { type: 'timed', label: 'Timed', icon: 'time-outline', color: '#60A5FA' },
  { type: 'intervals', label: 'Intervals', icon: 'repeat', color: '#F87171' },
  { type: 'tempo', label: 'Tempo', icon: 'speedometer-outline', color: '#FBBF24' },
  { type: 'easy_run', label: 'Easy Run', icon: 'leaf-outline', color: '#4ADE80' },
  { type: 'custom', label: 'Custom', icon: 'settings-outline', color: '#94A3B8' },
];
