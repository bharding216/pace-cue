/**
 * Spoken cue text, kept pure so the same strings are used both to
 * pre-generate premium voice clips and to play them at cue time.
 * The exact text of each phrase is its clip cache key.
 */

import type { PaceUnit } from '../pace/paceTypes';
import { formatPaceForSpeech } from '../pace/paceTracker';
import {
  type AppSettings,
  type FlatInterval,
  type WorkoutDefinition,
  flattenWorkout,
  isDistanceInterval,
  formatDurationForSpeech,
  formatDistanceForSpeech,
  formatCueDistanceForSpeech,
} from '../workout/workoutTypes';
import { cueDistanceMeters } from './cueSchedule';
import type { Clip } from './premiumVoice';

export interface CueContext {
  /** The label of the interval that just started (e.g. "Hard", "Easy", "Warm Up"). */
  currentLabel?: string;
  /** The label of the interval that just ended. */
  previousLabel?: string;
  // Verbose cue fields
  currentDuration?: number; // seconds (0 for distance-based)
  currentDistanceMeters?: number; // set for distance-based intervals
  effort?: number; // 1-10 perceived effort rating
  blockName?: string;
  blockNumber?: number;
  setNumber?: number;
  totalSets?: number;
  isFirstInBlock?: boolean;
  isFirstInSet?: boolean;
  blockSummary?: string;
  blockIntervalCount?: number;
  nextLabel?: string;
  nextDuration?: number;
  nextDistanceMeters?: number; // distance for next interval (if distance-based)
  nextEffort?: number; // effort for the next interval
  nextTargetPace?: number; // target pace in min/unit for the next interval
  warningSeconds?: number;
  targetPace?: number; // target pace in min/unit for current interval
  paceUnit?: PaceUnit; // unit for target pace announcement
}

/** A spoken phrase: the clips that play it in the premium voice, and the text device TTS speaks. */
export interface CuePhrase {
  clips: Clip[];
  text: string;
}

export const WORKOUT_COMPLETE_TEXT = 'Workout complete. Great job.';
export const PACE_UNAVAILABLE_TEXT = 'Pace unavailable';
export const VOICE_PREVIEW_TEXT = 'Starting warmup.';

/** Upper bound for untimed intervals when listing time-progress phrases ahead of a run. */
const UNTIMED_PROGRESS_LIMIT_SECONDS = 30 * 60;
const DISTANCE_PROGRESS_LIMIT: Record<PaceUnit, number> = {
  minPerMile: 10 * 1609.344,
  minPerKm: 15000,
};
const PACE_SEGMENT_MAX_MINUTES = 30;
/** Generate pace segments with ElevenLabs previous/next text so joins sound continuous. */
const PACE_SEGMENT_CONTEXT = true;

export function buildCueContext(
  ci: FlatInterval,
  ni: FlatInterval | null | undefined,
  paceUnit?: PaceUnit,
): CueContext {
  return {
    currentLabel: ci.label,
    currentDuration: ci.durationSeconds,
    currentDistanceMeters: ci.distanceMeters,
    effort: ci.effort,
    blockName: ci.blockName,
    blockNumber: ci.blockNumber,
    setNumber: ci.setNumber,
    totalSets: ci.totalSets,
    isFirstInBlock: ci.isFirstInBlock,
    isFirstInSet: ci.isFirstInSet,
    blockSummary: ci.blockSummary,
    blockIntervalCount: ci.blockIntervalCount,
    nextLabel: ni?.label,
    nextDuration: ni?.durationSeconds,
    nextDistanceMeters: ni?.distanceMeters,
    nextEffort: ni?.effort,
    nextTargetPace: ni?.targetPace,
    targetPace: ci.targetPace,
    paceUnit,
  };
}

function paceUnitLabel(unit: PaceUnit | undefined): string {
  return unit === 'minPerKm' ? 'per K' : 'per mile';
}

/**
 * Interval transition announcement.
 *
 * Examples:
 *   Block start: "Beginning Sprint. 3 minutes hard, 2 minutes easy. 4 sets. Starting hard for 3 minutes."
 *   Set start:   "Beginning set 2 of 4. Starting hard for 3 minutes."
 *   Interval:    "Starting easy for 2 minutes."
 */
export function intervalStartText(ctx: CueContext): string | null {
  const hasDuration = ctx.currentDuration && ctx.currentDuration > 0;
  const hasDistance = ctx.currentDistanceMeters && ctx.currentDistanceMeters > 0;
  if (!hasDuration && !hasDistance) {
    return ctx.currentLabel ? `Beginning ${ctx.currentLabel}` : null;
  }
  const parts: string[] = [];
  const measure = hasDistance && !hasDuration
    ? formatDistanceForSpeech(ctx.currentDistanceMeters!)
    : formatDurationForSpeech(ctx.currentDuration!);
  const effortSuffix = ctx.effort ? `, ${ctx.effort} out of 10 effort` : '';

  if (ctx.isFirstInBlock && ctx.totalSets && ctx.totalSets > 1) {
    parts.push(`Beginning ${ctx.blockName || `interval ${ctx.blockNumber}`}`);
    if (ctx.blockSummary) parts.push(ctx.blockSummary);
    parts.push(`${ctx.totalSets} sets`);
  } else if (ctx.isFirstInBlock && (ctx.blockIntervalCount ?? 0) > 1) {
    parts.push(`Beginning ${ctx.blockName || `interval ${ctx.blockNumber}`}`);
  } else if (ctx.isFirstInSet && ctx.totalSets && ctx.totalSets > 1) {
    parts.push(`Beginning set ${ctx.setNumber} of ${ctx.totalSets}`);
  }

  parts.push(`Starting ${ctx.currentLabel} for ${measure}${effortSuffix}`);

  if (ctx.targetPace != null && isFinite(ctx.targetPace)) {
    parts.push(`Target pace ${formatPaceForSpeech(ctx.targetPace)} ${paceUnitLabel(ctx.paceUnit)}`);
  }

  return parts.join('. ') + '.';
}

/** Countdown warning, e.g. "10 seconds. Next up, easy for 2 minutes." */
export function warningText(ctx: CueContext): string | null {
  const parts: string[] = [];
  if (ctx.warningSeconds) {
    parts.push(`${ctx.warningSeconds} seconds`);
  }
  const nextHasDuration = ctx.nextDuration && ctx.nextDuration > 0;
  const nextHasDistance = ctx.nextDistanceMeters && ctx.nextDistanceMeters > 0;
  if (ctx.nextLabel && (nextHasDuration || nextHasDistance)) {
    const nextMeasure = nextHasDistance && !nextHasDuration
      ? formatDistanceForSpeech(ctx.nextDistanceMeters!)
      : formatDurationForSpeech(ctx.nextDuration!);
    const nextEffort = ctx.nextEffort ? `, ${ctx.nextEffort} out of 10` : '';
    parts.push(`Next up, ${ctx.nextLabel} for ${nextMeasure}${nextEffort}`);
    if (ctx.nextTargetPace != null && isFinite(ctx.nextTargetPace)) {
      parts.push(`Target pace ${formatPaceForSpeech(ctx.nextTargetPace)} ${paceUnitLabel(ctx.paceUnit)}`);
    }
  } else if (!ctx.nextLabel) {
    parts.push('almost done');
  } else if (ctx.currentLabel) {
    parts.push(`Ending ${ctx.currentLabel}`);
  }
  return parts.length > 0 ? parts.join('. ') + '.' : null;
}

/** Spoken in beeps-only mode so users can tell which countdown fired. */
export function warningSecondsText(seconds: number): string {
  return `${seconds} seconds`;
}

/** "1 minute passed", "1 minute 30 seconds passed", "45 seconds passed". */
export function intervalProgressPhrase(elapsedSeconds: number): string {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const minWord = mins === 1 ? 'minute' : 'minutes';
  if (mins > 0 && secs > 0) return `${mins} ${minWord} ${secs} seconds passed`;
  if (mins > 0) return `${mins} ${minWord} passed`;
  return `${secs} seconds passed`;
}

/** "half mile passed", "1 kilometer passed", "500 meters passed". */
export function distanceProgressPhrase(meters: number, unit: PaceUnit): string {
  return `${formatCueDistanceForSpeech(meters, unit)} passed`;
}

/**
 * Factual pace cue — just the current pace, no judgment.
 *   "Current pace 7 minutes 35 seconds per mile"
 *   "Pace unavailable"
 */
export function paceCuePhrase(currentPaceMinutes: number | null, unit: PaceUnit): string {
  if (currentPaceMinutes == null || !isFinite(currentPaceMinutes)) {
    return PACE_UNAVAILABLE_TEXT;
  }
  return `Current pace ${formatPaceForSpeech(currentPaceMinutes)} ${paceUnitLabel(unit)}`;
}

// ── Pace segments ────────────────────────────────────────────────────

function prefixSegment(unit: PaceUnit): Clip {
  const text = 'Current pace';
  return PACE_SEGMENT_CONTEXT ? { text, nextText: `7 minutes 30 seconds ${paceUnitLabel(unit)}.` } : text;
}

function minutesSegment(minutes: number, unit: PaceUnit): Clip {
  const text = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  return PACE_SEGMENT_CONTEXT
    ? { text, previousText: 'Current pace', nextText: `30 seconds ${paceUnitLabel(unit)}.` }
    : text;
}

function secondsSegment(seconds: number, unit: PaceUnit): Clip {
  const text = `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  return PACE_SEGMENT_CONTEXT
    ? { text, previousText: 'Current pace 7 minutes', nextText: `${paceUnitLabel(unit)}.` }
    : text;
}

function suffixSegment(unit: PaceUnit): Clip {
  const text = paceUnitLabel(unit);
  return PACE_SEGMENT_CONTEXT ? { text, previousText: 'Current pace 7 minutes 30 seconds' } : text;
}

/** Pace cue as stitched clips: [Current pace] [7 minutes] [39 seconds] [per mile]. */
export function paceCue(currentPaceMinutes: number | null, unit: PaceUnit): CuePhrase {
  const text = paceCuePhrase(currentPaceMinutes, unit);
  if (currentPaceMinutes == null || !isFinite(currentPaceMinutes)) {
    return { clips: [text], text };
  }
  const total = Math.round(currentPaceMinutes * 60);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins < 1 || mins > PACE_SEGMENT_MAX_MINUTES) {
    return { clips: [text], text };
  }
  const clips: Clip[] = [prefixSegment(unit), minutesSegment(mins, unit)];
  if (secs > 0) clips.push(secondsSegment(secs, unit));
  clips.push(suffixSegment(unit));
  return { clips, text };
}

// ── Clip lists for pre-generation ────────────────────────────────────

/** Clips shared by every workout: completion, pace segments, and distance progress. */
export function globalPackClips(unit: PaceUnit): Clip[] {
  const clips: Clip[] = [WORKOUT_COMPLETE_TEXT, PACE_UNAVAILABLE_TEXT, VOICE_PREVIEW_TEXT];

  clips.push(prefixSegment(unit), suffixSegment(unit));
  for (let m = 1; m <= PACE_SEGMENT_MAX_MINUTES; m++) clips.push(minutesSegment(m, unit));
  for (let s = 1; s < 60; s++) clips.push(secondsSegment(s, unit));

  const step = cueDistanceMeters('quarter', unit);
  for (let d = step; d <= DISTANCE_PROGRESS_LIMIT[unit] + 1; d += step) {
    clips.push(distanceProgressPhrase(d, unit));
  }
  return clips;
}

/** Every sentence this workout can speak, given the user's cue settings. */
export function enumerateWorkoutPhrases(workout: WorkoutDefinition, settings: AppSettings): Clip[] {
  const phrases = new Set<string>();
  const intervals = flattenWorkout(workout);
  const progressStep =
    settings.progressCueBasis === 'time' ? settings.timeRemainingInterval : 0;

  intervals.forEach((ci, i) => {
    const ctx = buildCueContext(ci, intervals[i + 1], settings.paceUnit);
    const start = intervalStartText(ctx);
    if (start) phrases.add(start);

    const timed = !isDistanceInterval(ci) && ci.durationSeconds > 0;
    if (timed) {
      for (const w of settings.countdownWarningSeconds) {
        if (w <= 3) continue;
        const warning = warningText({ ...ctx, warningSeconds: w });
        if (warning) phrases.add(warning);
        phrases.add(warningSecondsText(w));
      }
    }

    if (progressStep > 0) {
      const limit = timed ? ci.durationSeconds : UNTIMED_PROGRESS_LIMIT_SECONDS;
      for (let t = progressStep; t < limit; t += progressStep) {
        phrases.add(intervalProgressPhrase(t));
      }
    }
  });

  return [...phrases];
}
