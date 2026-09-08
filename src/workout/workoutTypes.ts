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
  warmup: WorkoutInterval | null;
  blocks: WorkoutRepeatBlock[];
  cooldown: WorkoutInterval | null;
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

export interface AppSettings {
  audioCueMode: AudioCueMode;
  hapticEnabled: boolean;
  countdownWarningSeconds: number; // seconds before interval end to play warning
  keepScreenOn: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  audioCueMode: 'beeps',
  hapticEnabled: true,
  countdownWarningSeconds: 10,
  keepScreenOn: true,
};

/** Flatten a WorkoutDefinition into an ordered list of FlatIntervals. */
export function flattenWorkout(def: WorkoutDefinition): FlatInterval[] {
  const result: FlatInterval[] = [];
  let idx = 0;

  if (def.warmup) {
    result.push({
      type: 'warmup',
      durationSeconds: def.warmup.durationSeconds,
      label: def.warmup.label || 'Warm Up',
      index: idx++,
    });
  }

  for (const block of def.blocks) {
    for (let r = 0; r < block.repeatCount; r++) {
      for (const interval of block.intervals) {
        result.push({
          type: interval.type,
          durationSeconds: interval.durationSeconds,
          label:
            interval.label ||
            (interval.type === 'hard' ? 'Hard' : 'Easy'),
          index: idx++,
        });
      }
    }
  }

  if (def.cooldown) {
    result.push({
      type: 'cooldown',
      durationSeconds: def.cooldown.durationSeconds,
      label: def.cooldown.label || 'Cool Down',
      index: idx++,
    });
  }

  return result;
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
