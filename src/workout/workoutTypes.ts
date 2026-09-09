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

export interface WorkoutInterval {
  type: IntervalType;
  durationSeconds: number;
  label?: string; // optional user-facing label override
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
  createdAt: number; // epoch ms
  updatedAt: number;
}

/** A flattened interval ready for the engine to execute sequentially. */
export interface FlatInterval {
  type: IntervalType;
  durationSeconds: number;
  label: string;
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

export interface CompletedWorkout {
  id: string;
  workoutId: string;
  workoutName: string;
  completedAt: number; // epoch ms
  totalDurationMs: number;
}

/** Audio cue preference. */
export type AudioCueMode = 'voice' | 'beeps' | 'both' | 'silent';

/** How often to announce elapsed time during an interval (in seconds, 0 = off). */
export type TimeRemainingInterval = 0 | 15 | 30 | 45 | 60 | 120;

export interface AppSettings {
  audioCueMode: AudioCueMode;
  hapticEnabled: boolean;
  countdownWarningSeconds: number; // seconds before interval end to play warning
  keepScreenOn: boolean;
  timeRemainingInterval: TimeRemainingInterval; // 0 = off, seconds between elapsed-time announcements
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
        (i) =>
          `${formatDurationForSpeech(i.durationSeconds)} ${i.label || defaultLabel(i.type)}`,
      )
      .join(', ');
    for (let r = 0; r < block.repeatCount; r++) {
      for (let ii = 0; ii < block.intervals.length; ii++) {
        const interval = block.intervals[ii];
        items.push({
          type: interval.type,
          durationSeconds: interval.durationSeconds,
          label: interval.label || defaultLabel(interval.type),
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
