/**
 * Core data types for PaceCue workouts.
 *
 * The workout model is designed to be platform-independent so the same
 * engine can eventually drive an iPhone UI, Apple Watch UI, or anything else.
 */

export type IntervalType = 'warmup' | 'hard' | 'easy' | 'cooldown';

export interface WorkoutInterval {
  type: IntervalType;
  durationSeconds: number;
  label?: string; // optional user-facing label override
}

export interface WorkoutRepeatBlock {
  intervals: WorkoutInterval[];
  repeatCount: number;
}

export interface WorkoutDefinition {
  id: string;
  name: string;
  warmup: WorkoutRepeatBlock[];
  blocks: WorkoutRepeatBlock[];
  cooldown: WorkoutRepeatBlock[];
  createdAt: number; // epoch ms
  updatedAt: number;
}

/** A flattened interval ready for the engine to execute sequentially. */
export interface FlatInterval {
  type: IntervalType;
  durationSeconds: number;
  label: string;
  index: number; // position in the flattened list
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

export interface CompletedWorkout {
  id: string;
  workoutId: string;
  workoutName: string;
  completedAt: number; // epoch ms
  totalDurationMs: number;
}

/** Audio cue preference. */
export type AudioCueMode = 'voice' | 'beeps' | 'both' | 'silent';

/** How often to announce time remaining during an interval (in seconds, 0 = off). */
export type TimeRemainingInterval = 0 | 15 | 30 | 60 | 120;

export interface AppSettings {
  audioCueMode: AudioCueMode;
  hapticEnabled: boolean;
  countdownWarningSeconds: number; // seconds before interval end to play warning
  keepScreenOn: boolean;
  timeRemainingInterval: TimeRemainingInterval; // 0 = off
}

export const DEFAULT_SETTINGS: AppSettings = {
  audioCueMode: 'beeps',
  hapticEnabled: true,
  countdownWarningSeconds: 10,
  keepScreenOn: true,
  timeRemainingInterval: 0,
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

/** Flatten a list of repeat blocks into sequential FlatIntervals. */
function flattenBlocks(
  blocks: WorkoutRepeatBlock[],
  startIdx: number,
): { items: FlatInterval[]; nextIdx: number } {
  const items: FlatInterval[] = [];
  let idx = startIdx;
  for (const block of blocks) {
    for (let r = 0; r < block.repeatCount; r++) {
      for (const interval of block.intervals) {
        items.push({
          type: interval.type,
          durationSeconds: interval.durationSeconds,
          label: interval.label || defaultLabel(interval.type),
          index: idx++,
        });
      }
    }
  }
  return { items, nextIdx: idx };
}

/** Flatten a WorkoutDefinition into an ordered list of FlatIntervals. */
export function flattenWorkout(def: WorkoutDefinition): FlatInterval[] {
  const warmup = flattenBlocks(def.warmup, 0);
  const main = flattenBlocks(def.blocks, warmup.nextIdx);
  const cooldown = flattenBlocks(def.cooldown, main.nextIdx);
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
