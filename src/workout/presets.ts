/**
 * Default workout presets so the app isn't empty on first launch.
 * Organized by purpose: easy, tempo, intervals, long run, and race.
 */

import {
  WorkoutDefinition,
  generateId,
  type Segment,
  type RepeatGroup,
  type WorkoutBlock,
  type SegmentType,
  type Intensity,
  type SegmentTarget,
} from './workoutTypes';

/** Names of presets that use distance-based intervals, used for backfill detection. */
const DISTANCE_PRESET_NAMES = [
  '2 Mile Easy',
  '5K Easy Run',
  '10K Steady',
  'Half Marathon Run/Walk',
  'Mile Repeats (Distance)',
] as const;

/**
 * Return any distance-based presets that are missing from `existing`.
 * Used to backfill existing users who installed before distance presets existed.
 */
export function getMissingDistancePresets(existing: WorkoutDefinition[]): WorkoutDefinition[] {
  const existingNames = new Set(existing.map((w) => w.name));
  const hasAnyDistancePreset = existing.some((w) =>
    (DISTANCE_PRESET_NAMES as readonly string[]).includes(w.name),
  );
  if (hasAnyDistancePreset) return [];
  return createPresets().filter(
    (p) =>
      (DISTANCE_PRESET_NAMES as readonly string[]).includes(p.name) &&
      !existingNames.has(p.name),
  );
}

// ── Block-building helpers ───────────────────────────────────────────

function seg(
  segmentType: SegmentType,
  target: SegmentTarget,
  opts?: { label?: string; intensity?: Intensity; targetPace?: number },
): Segment {
  return {
    id: generateId(),
    blockType: 'segment',
    segmentType,
    target,
    label: opts?.label,
    intensity: opts?.intensity,
    targetPace: opts?.targetPace,
  };
}

function time(seconds: number): SegmentTarget {
  return { type: 'time', durationSeconds: seconds };
}

function dist(meters: number): SegmentTarget {
  return { type: 'distance', distanceMeters: meters };
}

function repeat(
  repetitions: number,
  blocks: WorkoutBlock[],
  name?: string,
): RepeatGroup {
  return { id: generateId(), blockType: 'repeat', repetitions, name, blocks };
}

export function createPresets(): WorkoutDefinition[] {
  const now = Date.now();
  const w = (name: string, blocks: WorkoutBlock[], extra?: Partial<WorkoutDefinition>): WorkoutDefinition => ({
    id: generateId(),
    name,
    blocks,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });

  return [
    // ── Easy / Recovery ──────────────────────────────────────────────

    w('Easy 30 Min', [
      seg('run', time(1800), { label: 'Easy Run', intensity: 'easy' }),
    ], { category: 'easy' }),

    w('Easy 45 Min', [
      seg('run', time(2700), { label: 'Easy Run', intensity: 'easy' }),
    ], { category: 'easy' }),

    w('2 Mile Easy', [
      seg('warmup', time(300)),
      seg('run', dist(3219), { label: 'Easy Run', intensity: 'easy' }),
      seg('cooldown', time(180)),
    ], { category: 'easy' }),

    w('Run/Walk', [
      seg('warmup', time(180), { label: 'Walk' }),
      repeat(8, [
        seg('run', time(180), { label: 'Run', intensity: 'easy' }),
        seg('recovery', time(60), { label: 'Walk' }),
      ]),
      seg('cooldown', time(120), { label: 'Walk' }),
    ], { category: 'easy' }),

    // ── Tempo ──────────────────────────────────────────────────────

    w('Tempo Run', [
      seg('warmup', time(480)),
      repeat(3, [
        seg('run', time(20), { label: 'Stride', intensity: 'hard' }),
        seg('recovery', time(60), { label: 'Easy Jog' }),
      ]),
      seg('run', time(1200), { label: 'Tempo', intensity: 'tempo' }),
      seg('cooldown', time(300)),
    ], { category: 'tempo' }),

    w('10K Steady', [
      seg('warmup', time(480)),
      seg('run', dist(10000), { label: 'Steady', intensity: 'tempo' }),
      seg('cooldown', time(300)),
    ], { category: 'tempo', targetDistanceMeters: 10000 }),

    // ── Intervals ──────────────────────────────────────────────────

    w('5K Speed', [
      seg('warmup', time(600)),
      repeat(6, [
        seg('run', time(180), { label: 'Hard', intensity: 'hard' }),
        seg('recovery', time(120), { label: 'Easy' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('Short Intervals', [
      seg('warmup', time(300)),
      repeat(8, [
        seg('run', time(90), { label: 'Sprint', intensity: 'sprint' }),
        seg('recovery', time(90), { label: 'Recover' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('Pyramid', [
      seg('warmup', time(600)),
      repeat(1, [
        seg('run', time(60), { intensity: 'hard' }),
        seg('recovery', time(60)),
      ]),
      repeat(1, [
        seg('run', time(120), { intensity: 'hard' }),
        seg('recovery', time(120)),
      ]),
      repeat(1, [
        seg('run', time(180), { intensity: 'hard' }),
        seg('recovery', time(180)),
      ]),
      repeat(1, [
        seg('run', time(120), { intensity: 'hard' }),
        seg('recovery', time(120)),
      ]),
      repeat(1, [
        seg('run', time(60), { intensity: 'hard' }),
        seg('recovery', time(60)),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('Fartlek', [
      seg('warmup', time(600)),
      repeat(3, [
        seg('run', time(120), { label: 'Speed', intensity: 'hard' }),
        seg('recovery', time(60), { label: 'Jog' }),
      ]),
      repeat(3, [
        seg('run', time(60), { label: 'Sprint', intensity: 'sprint' }),
        seg('recovery', time(60), { label: 'Jog' }),
      ]),
      repeat(4, [
        seg('run', time(30), { label: 'Sprint', intensity: 'sprint' }),
        seg('recovery', time(30), { label: 'Float' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('Hill Repeats', [
      seg('warmup', time(600)),
      repeat(8, [
        seg('run', time(60), { label: 'Hill', intensity: 'hard' }),
        seg('recovery', time(90), { label: 'Jog' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('Mile Repeats (Distance)', [
      seg('warmup', time(600)),
      repeat(4, [
        seg('run', dist(1609), { label: 'Race Pace', intensity: 'hard' }),
        seg('recovery', time(120), { label: 'Recovery' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('Mile Intervals', [
      seg('warmup', time(600)),
      repeat(3, [
        seg('run', time(20), { label: 'Stride', intensity: 'hard' }),
        seg('recovery', time(60), { label: 'Easy Jog' }),
      ]),
      repeat(4, [
        seg('run', time(360), { label: 'Race Pace', intensity: 'hard' }),
        seg('recovery', time(120), { label: 'Recovery' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('400m Repeats', [
      seg('warmup', time(600)),
      repeat(4, [
        seg('run', time(20), { label: 'Stride', intensity: 'hard' }),
        seg('recovery', time(40), { label: 'Easy Jog' }),
      ]),
      repeat(10, [
        seg('run', time(90), { label: 'Sprint', intensity: 'sprint' }),
        seg('recovery', time(90), { label: 'Recovery' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    w('5K Training', [
      seg('warmup', time(480)),
      repeat(3, [
        seg('run', time(20), { label: 'Stride', intensity: 'hard' }),
        seg('recovery', time(60), { label: 'Easy Jog' }),
      ]),
      repeat(3, [
        seg('run', time(300), { label: 'Tempo', intensity: 'tempo' }),
        seg('recovery', time(120), { label: 'Recovery' }),
      ]),
      repeat(3, [
        seg('run', time(60), { label: 'Speed', intensity: 'sprint' }),
        seg('recovery', time(60), { label: 'Jog' }),
      ]),
      seg('cooldown', time(300)),
    ], { category: 'intervals' }),

    // ── Long Runs ──────────────────────────────────────────────────

    w('Long Run 60 Min', [
      seg('warmup', time(300)),
      seg('run', time(3300), { label: 'Endurance', intensity: 'easy' }),
      seg('cooldown', time(300)),
    ], { category: 'long_run' }),

    // ── Race / Time Trial ──────────────────────────────────────────

    w('5K Easy Run', [
      seg('warmup', time(300)),
      seg('run', dist(5000), { label: 'Easy Run', intensity: 'easy' }),
      seg('cooldown', time(300)),
    ], { category: 'race', targetDistanceMeters: 5000 }),

    w('Half Marathon Run/Walk', [
      seg('warmup', time(300), { label: 'Walk' }),
      repeat(15, [
        seg('run', time(600), { label: 'Run', intensity: 'easy' }),
        seg('recovery', time(60), { label: 'Walk' }),
      ]),
    ], { category: 'race', targetDistanceMeters: 21097 }),
  ];
}
