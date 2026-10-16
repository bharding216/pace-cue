/**
 * Default workout presets so the app isn't empty on first launch.
 * Organized into three categories: distance, timed, and intervals.
 */

import { WorkoutDefinition, generateId, categorizeWorkout } from './workoutTypes';

/** Names of the distance-run presets, used to detect missing ones during backfill. */
const DISTANCE_PRESET_NAMES = [
  '2 Mile Easy',
  '5K Easy Run',
  '10K Steady',
  'Half Marathon Run/Walk',
  'Mile Repeats (Distance)',
] as const;

/**
 * Return any distance-run presets that are missing from `existing`.
 * Used to backfill existing users who installed before distance presets existed.
 */
export function getMissingDistancePresets(existing: WorkoutDefinition[]): WorkoutDefinition[] {
  const existingNames = new Set(existing.map((w) => w.name));
  const hasAnyDistance = existing.some((w) => categorizeWorkout(w) === 'distance');
  if (hasAnyDistance) return [];
  return createPresets().filter(
    (p) =>
      (DISTANCE_PRESET_NAMES as readonly string[]).includes(p.name) &&
      !existingNames.has(p.name),
  );
}

export function createPresets(): WorkoutDefinition[] {
  const now = Date.now();

  return [
    // ── Distance Runs (GPS-tracked by distance) ────────────────────

    {
      id: generateId(),
      name: '2 Mile Easy',
      targetDistanceMeters: 3219,
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 0, distanceMeters: 3219, label: 'Easy Run' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 180 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '5K Easy Run',
      targetDistanceMeters: 5000,
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 0, distanceMeters: 5000, label: 'Easy Run' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '10K Steady',
      targetDistanceMeters: 10000,
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 480 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 0, distanceMeters: 10000, label: 'Steady' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Half Marathon Run/Walk',
      targetDistanceMeters: 21097,
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 300, label: 'Walk' }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 600, label: 'Run' },
            { type: 'easy', durationSeconds: 60, label: 'Walk' },
          ],
          repeatCount: 15,
        },
      ],
      cooldown: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Mile Repeats (Distance)',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 0, distanceMeters: 1609, label: 'Race Pace' },
            { type: 'easy', durationSeconds: 120, label: 'Recovery' },
          ],
          repeatCount: 4,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },

    // ── Timed Runs ─────────────────────────────────────────────────

    {
      id: generateId(),
      name: 'Easy 30 Min',
      warmup: [],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 1800, label: 'Easy Run' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Easy 45 Min',
      warmup: [],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 2700, label: 'Easy Run' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Long Run 60 Min',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 3300, label: 'Endurance' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },

    // ── Interval Workouts ──────────────────────────────────────────

    {
      id: generateId(),
      name: '5K Speed',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
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
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Tempo Run',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 480 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 60, label: 'Easy Jog' },
          ],
          repeatCount: 3,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 1200, label: 'Tempo' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Short Intervals',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 90, label: 'Sprint' },
            { type: 'easy', durationSeconds: 90, label: 'Recover' },
          ],
          repeatCount: 8,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Pyramid',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 60 },
            { type: 'easy', durationSeconds: 60 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 120 },
            { type: 'easy', durationSeconds: 120 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 180 },
            { type: 'easy', durationSeconds: 180 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 120 },
            { type: 'easy', durationSeconds: 120 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 60 },
            { type: 'easy', durationSeconds: 60 },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Fartlek',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 120, label: 'Speed' },
            { type: 'easy', durationSeconds: 60, label: 'Jog' },
          ],
          repeatCount: 3,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 60, label: 'Sprint' },
            { type: 'easy', durationSeconds: 60, label: 'Jog' },
          ],
          repeatCount: 3,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 30, label: 'Sprint' },
            { type: 'easy', durationSeconds: 30, label: 'Float' },
          ],
          repeatCount: 4,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Hill Repeats',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 60, label: 'Hill' },
            { type: 'easy', durationSeconds: 90, label: 'Jog' },
          ],
          repeatCount: 8,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Mile Intervals',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 60, label: 'Easy Jog' },
          ],
          repeatCount: 3,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 360, label: 'Race Pace' },
            { type: 'easy', durationSeconds: 120, label: 'Recovery' },
          ],
          repeatCount: 4,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '400m Repeats',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 40, label: 'Easy Jog' },
          ],
          repeatCount: 4,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 90, label: 'Sprint' },
            { type: 'easy', durationSeconds: 90, label: 'Recovery' },
          ],
          repeatCount: 10,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Run/Walk',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 180, label: 'Walk' }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 180, label: 'Run' },
            { type: 'easy', durationSeconds: 60, label: 'Walk' },
          ],
          repeatCount: 8,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 120, label: 'Walk' }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '5K Training',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 480 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 60, label: 'Easy Jog' },
          ],
          repeatCount: 3,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 300, label: 'Tempo' },
            { type: 'easy', durationSeconds: 120, label: 'Recovery' },
          ],
          repeatCount: 3,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 60, label: 'Speed' },
            { type: 'easy', durationSeconds: 60, label: 'Jog' },
          ],
          repeatCount: 3,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}
