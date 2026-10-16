/**
 * Core data types for PaceCue workouts.
 *
 * The workout model is designed to be platform-independent so the same
 * engine can eventually drive an iPhone UI, Apple Watch UI, or anything else.
 */

export type IntervalType = 'warmup' | 'hard' | 'easy' | 'cooldown';

/** Predefined block name options safe for TTS pronunciation. */
export const BLOCK_NAME_OPTIONS = [
  'Sprint',
  'Pace',
  'Tempo',
  'Recovery',
  'Jog',
  'Stride',
  'Threshold',
  'Race Pace',
  'Cruise',
  'Fartlek',
  'Hill',
  'Build Up',
  'Easy Run',
  'Steady',
  'Speed',
  'Endurance',
] as const;

export type BlockName = (typeof BLOCK_NAME_OPTIONS)[number];

/**
 * Interval-level label presets, grouped by IntervalType.
 * Shown as quick-tap chips in the editor; users can also type a custom label.
 */
export const INTERVAL_LABEL_OPTIONS: Record<IntervalType, readonly string[]> = {
  hard: [
    'Sprint',
    'Run',
    'Stride',
    'Tempo',
    'Race Pace',
    'Threshold',
    'Hill',
    'Speed',
    'Build Up',
    'Fartlek',
  ],
  easy: [
    'Walk',
    'Jog',
    'Recovery',
    'Easy Run',
    'Rest',
    'Reset',
    'Float',
  ],
  warmup: [
    'Warm Up',
    'Easy Jog',
    'Walk',
    'Stride',
    'Drills',
    'Rest',
    'Reset',
  ],
  cooldown: [
    'Cool Down',
    'Easy Jog',
    'Walk',
  ],
} as const;

export interface WorkoutInterval {
  type: IntervalType;
  durationSeconds: number; // 0 for purely distance-based intervals
  distanceMeters?: number; // if set and > 0, interval ends on GPS distance
  label?: string; // optional user-facing label override
  effort?: number; // optional perceived effort 1-10 (e.g. 7 = "7/10 effort")
  targetPace?: number; // optional target pace in min/mile (e.g. 8.5 = 8:30/mile)
}

export interface WorkoutRepeatBlock {
  intervals: WorkoutInterval[];
  repeatCount: number;
  name?: string; // predefined block name from BLOCK_NAME_OPTIONS
}

export interface WorkoutDefinition {
  id: string;
  name: string;
  warmup: WorkoutRepeatBlock[];
  blocks: WorkoutRepeatBlock[];
  cooldown: WorkoutRepeatBlock[];
  targetDistanceMeters?: number; // if set, workout auto-finishes at this GPS distance
  category?: WorkoutCategory; // user-assigned category override (auto-detected if omitted)
  createdAt: number; // epoch ms
  updatedAt: number;
}

/** A flattened interval ready for the engine to execute sequentially. */
export interface FlatInterval {
  type: IntervalType;
  durationSeconds: number; // 0 for purely distance-based intervals
  distanceMeters?: number; // if set, interval ends on GPS distance
  label: string;
  effort?: number; // 1-10 perceived effort rating
  targetPace?: number; // min/mile target pace
  index: number; // position in the flattened list
  // Block/set context for verbose voice cues and progress display
  blockName?: string; // user-assigned block name (e.g. "Sprint")
  blockNumber: number; // 1-indexed block number across entire workout
  setNumber: number; // 1-indexed repeat within the block
  totalSets: number; // total repeats for this block
  isFirstInSet: boolean; // first interval of a new repeat iteration
  isFirstInBlock: boolean; // first interval of the block's very first repeat
  blockSummary: string; // spoken format e.g. "3 minutes hard, 2 minutes easy"
  blockIntervalCount: number; // how many intervals per set in this block
}

/** Phases the workout engine can be in. */
export type EnginePhase = 'idle' | 'running' | 'paused' | 'finished';

export interface EngineState {
  phase: EnginePhase;
  /** The full ordered list of intervals for this workout. */
  intervals: FlatInterval[];
  /** Index into `intervals` of the currently active interval. */
  currentIndex: number;
  /** Absolute epoch-ms timestamp when the current interval ends. */
  intervalEndsAt: number;
  /** How many ms were remaining when paused (used for resume). */
  pausedRemaining: number;
  /** Total elapsed workout time in ms (tracked for history). */
  totalElapsedMs: number;
  /** Timestamp of when the workout was started. */
  startedAt: number;
}

/** A single point on the recorded GPS route (abbreviated keys for storage). */
export interface RoutePoint {
  lat: number;
  lng: number;
  alt: number | null; // meters above sea level
  ts: number; // epoch ms
  dist: number; // cumulative distance in meters
}

/** Per-interval performance data captured during a workout. */
export interface IntervalSplit {
  label: string;
  type: IntervalType;
  plannedDurationSec: number;
  actualDurationMs: number;
  distanceMeters: number | null;
  avgPaceMinPerMile: number | null;
  avgPaceMinPerKm: number | null;
  targetPace: number | undefined;
  effort: number | undefined;
}

// ── Workout Tags ─────────────────────────────────────────────────────

export type WorkoutTagCategory = 'type' | 'feel' | 'effort' | 'weather' | 'social';

export interface WorkoutTagGroup {
  category: WorkoutTagCategory;
  label: string;
  icon: string; // Ionicons name
  tags: readonly string[];
}

export const WORKOUT_TAG_GROUPS: readonly WorkoutTagGroup[] = [
  {
    category: 'type',
    label: 'Run Type',
    icon: 'footsteps-outline',
    tags: [
      'Recovery',
      'Easy Day',
      'Long Run',
      'Tempo',
      'Speed Work',
      'Race',
      'Stroller Run',
      'Trail',
      'Treadmill',
      'Track',
      'Hill Training',
    ],
  },
  {
    category: 'feel',
    label: 'How It Felt',
    icon: 'heart-outline',
    tags: ['Amazing', 'Strong', 'Good', 'OK', 'Tough', 'Sluggish', 'Exhausted'],
  },
  {
    category: 'effort',
    label: 'Overall Effort',
    icon: 'flame-outline',
    tags: ['Easy', 'Moderate', 'Hard', 'All-Out'],
  },
  {
    category: 'weather',
    label: 'Weather',
    icon: 'partly-sunny-outline',
    tags: ['Hot', 'Cold', 'Windy', 'Rainy', 'Humid', 'Perfect'],
  },
  {
    category: 'social',
    label: 'Social',
    icon: 'people-outline',
    tags: ['Solo', 'With Group', 'With Partner', 'Race Day'],
  },
] as const;

/** All valid preset tags (flat list for validation). */
export const ALL_PRESET_TAGS = WORKOUT_TAG_GROUPS.flatMap((g) => g.tags);

export interface CompletedWorkout {
  id: string;
  workoutId: string;
  workoutName: string;
  completedAt: number; // epoch ms
  totalDurationMs: number;
  splits?: IntervalSplit[];
  totalDistanceMeters?: number;
  route?: RoutePoint[]; // full GPS track with elevation (null if pace tracking was off)
  tags?: string[]; // user-applied tags from WORKOUT_TAG_GROUPS
}

/** Audio cue preference. */
export type AudioCueMode = 'voice' | 'beeps' | 'both' | 'silent';

/** How often to announce elapsed time during an interval (in seconds, 0 = off). */
export type TimeRemainingInterval = 0 | 15 | 30 | 45 | 60 | 120;

import type { PaceCueFrequency, PaceWindowSize, PaceUnit } from '../pace/paceTypes';

export interface AppSettings {
  audioCueMode: AudioCueMode;
  hapticEnabled: boolean;
  countdownWarningSeconds: number[]; // seconds before interval end to play warning(s)
  keepScreenOn: boolean;
  timeRemainingInterval: TimeRemainingInterval; // 0 = off, seconds between elapsed-time announcements
  voiceIdentifier: string | null; // selected TTS voice identifier, null = system default
  duckOtherAudio: boolean; // lower other apps' volume when cues play
  // Pace tracking
  paceTrackingEnabled: boolean;
  paceCueFrequency: PaceCueFrequency; // how often to announce pace (seconds, 0 = off)
  paceWindow: PaceWindowSize; // rolling window for pace calculation (seconds)
  paceUnit: PaceUnit; // min/mile or min/km
  paceCueOnlyWithTarget: boolean; // only announce pace on intervals with a target pace set
}

export const DEFAULT_SETTINGS: AppSettings = {
  audioCueMode: 'both',
  hapticEnabled: true,
  countdownWarningSeconds: [10],
  keepScreenOn: true,
  timeRemainingInterval: 60,
  voiceIdentifier: null,
  duckOtherAudio: false,
  paceTrackingEnabled: false,
  paceCueFrequency: 30,
  paceWindow: 30,
  paceUnit: 'minPerMile',
  paceCueOnlyWithTarget: false,
};

/** Default label for an interval based on its type. */
function defaultLabel(type: IntervalType): string {
  switch (type) {
    case 'warmup': return 'Warm Up';
    case 'cooldown': return 'Cool Down';
    case 'hard': return 'Hard';
    case 'easy': return 'Easy';
  }
}

/** Format seconds into natural speech (e.g. "3 minutes", "1 minute 30 seconds"). */
export function formatDurationForSpeech(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0 && secs > 0) {
    const minWord = mins === 1 ? 'minute' : 'minutes';
    const secWord = secs === 1 ? 'second' : 'seconds';
    return `${mins} ${minWord} ${secs} ${secWord}`;
  } else if (mins > 0) {
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  } else {
    return `${secs} ${secs === 1 ? 'second' : 'seconds'}`;
  }
}

/** Flatten a list of repeat blocks into sequential FlatIntervals. */
function flattenBlocks(
  blocks: WorkoutRepeatBlock[],
  startIdx: number,
  startBlockNumber: number,
): { items: FlatInterval[]; nextIdx: number; nextBlockNumber: number } {
  const items: FlatInterval[] = [];
  let idx = startIdx;
  let blockNum = startBlockNumber;
  for (const block of blocks) {
    const summary = block.intervals
      .map(
        (i) => {
          const base = formatIntervalDescription(i);
          return i.effort ? `${base} at ${i.effort} out of 10` : base;
        },
      )
      .join(', ');
    for (let r = 0; r < block.repeatCount; r++) {
      for (let ii = 0; ii < block.intervals.length; ii++) {
        const interval = block.intervals[ii];
        items.push({
          type: interval.type,
          durationSeconds: interval.durationSeconds,
          distanceMeters: interval.distanceMeters,
          label: interval.label || defaultLabel(interval.type),
          effort: interval.effort,
          targetPace: interval.targetPace,
          index: idx++,
          blockName: block.name,
          blockNumber: blockNum,
          setNumber: r + 1,
          totalSets: block.repeatCount,
          isFirstInSet: ii === 0,
          isFirstInBlock: ii === 0 && r === 0,
          blockSummary: summary,
          blockIntervalCount: block.intervals.length,
        });
      }
    }
    blockNum++;
  }
  return { items, nextIdx: idx, nextBlockNumber: blockNum };
}

/** Flatten a WorkoutDefinition into an ordered list of FlatIntervals. */
export function flattenWorkout(def: WorkoutDefinition): FlatInterval[] {
  const warmup = flattenBlocks(def.warmup, 0, 1);
  const main = flattenBlocks(def.blocks, warmup.nextIdx, warmup.nextBlockNumber);
  const cooldown = flattenBlocks(
    def.cooldown,
    main.nextIdx,
    main.nextBlockNumber,
  );
  return [...warmup.items, ...main.items, ...cooldown.items];
}

/** Calculate total duration of a workout in seconds. */
export function totalWorkoutSeconds(def: WorkoutDefinition): number {
  return flattenWorkout(def).reduce((sum, i) => sum + i.durationSeconds, 0);
}

/** Format seconds into MM:SS. */
export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(Math.abs(totalSeconds) / 60);
  const secs = Math.floor(Math.abs(totalSeconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Generate a simple unique ID. */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Distance helpers ─────────────────────────────────────────────────

export const METERS_PER_MILE = 1609.344;
export const METERS_PER_KM = 1000;

/** Maximum engine duration for distance-based intervals (12 hours in ms). */
export const DISTANCE_INTERVAL_MAX_MS = 12 * 60 * 60 * 1000;

/** Common race distances in meters. */
export const RACE_DISTANCES = {
  '5K': 5000,
  '10K': 10000,
  'Half Marathon': 21097,
  'Marathon': 42195,
} as const;

/** Whether an interval is purely distance-based (no time limit). */
export function isDistanceInterval(interval: { durationSeconds: number; distanceMeters?: number }): boolean {
  return !!(interval.distanceMeters && interval.distanceMeters > 0 && !interval.durationSeconds);
}

/** Whether a workout has any distance-based features. */
export function hasDistanceFeature(def: WorkoutDefinition): boolean {
  if (def.targetDistanceMeters) return true;
  const allBlocks = [...def.warmup, ...def.blocks, ...def.cooldown];
  return allBlocks.some(b =>
    b.intervals.some(i => i.distanceMeters && i.distanceMeters > 0)
  );
}

/**
 * Format meters into natural speech. Uses common names for well-known
 * distances; falls back to miles/km/meters as appropriate.
 */
export function formatDistanceForSpeech(meters: number): string {
  if (Math.abs(meters - METERS_PER_MILE) < 10) return '1 mile';
  if (Math.abs(meters - METERS_PER_MILE * 0.5) < 10) return 'half mile';
  if (Math.abs(meters - METERS_PER_MILE * 0.25) < 10) return 'quarter mile';
  if (Math.abs(meters - 400) < 5) return '400 meters';
  if (Math.abs(meters - 800) < 5) return '800 meters';
  if (Math.abs(meters - 1000) < 5) return '1 kilometer';
  if (Math.abs(meters - 5000) < 50) return '5 K';
  if (Math.abs(meters - 10000) < 100) return '10 K';
  if (Math.abs(meters - 21097) < 100) return 'half marathon';
  if (Math.abs(meters - 42195) < 200) return 'marathon';
  if (meters >= METERS_PER_MILE) {
    const miles = meters / METERS_PER_MILE;
    const rounded = Math.round(miles * 10) / 10;
    return `${rounded} ${rounded === 1 ? 'mile' : 'miles'}`;
  }
  if (meters >= 1000) {
    const km = meters / METERS_PER_KM;
    return `${Math.round(km * 10) / 10} kilometers`;
  }
  return `${Math.round(meters)} meters`;
}

/** Format meters for compact UI display (e.g. "1.00 mi" or "5.00 km"). */
export function formatDistanceShort(meters: number, unit: 'minPerMile' | 'minPerKm'): string {
  if (unit === 'minPerMile') {
    return `${(meters / METERS_PER_MILE).toFixed(2)} mi`;
  }
  return `${(meters / METERS_PER_KM).toFixed(2)} km`;
}

/** Format the description of an interval for block summaries (speech). */
function formatIntervalDescription(i: WorkoutInterval): string {
  const label = i.label || defaultLabel(i.type);
  if (isDistanceInterval(i)) {
    return `${formatDistanceForSpeech(i.distanceMeters!)} ${label}`;
  }
  return `${formatDurationForSpeech(i.durationSeconds)} ${label}`;
}

// ── Workout categorization ───────────────────────────────────────────

export type WorkoutCategory = 'distance' | 'timed' | 'intervals';

/** Return the category of a workout: user-assigned override, or auto-detected. */
export function categorizeWorkout(def: WorkoutDefinition): WorkoutCategory {
  if (def.category) return def.category;
  if (hasDistanceFeature(def)) return 'distance';
  const hasRepeats = def.blocks.some(b => b.repeatCount > 1);
  const hasMultipleIntervalTypes = def.blocks.some(b => b.intervals.length > 1);
  if (hasRepeats || def.blocks.length > 1 || hasMultipleIntervalTypes) return 'intervals';
  return 'timed';
}

/** Total target distance for the workout (if any). */
export function totalWorkoutDistanceMeters(def: WorkoutDefinition): number | null {
  if (def.targetDistanceMeters) return def.targetDistanceMeters;
  const flattened = flattenWorkout(def);
  const totalDist = flattened.reduce((sum, i) => sum + (i.distanceMeters || 0), 0);
  return totalDist > 0 ? totalDist : null;
}
