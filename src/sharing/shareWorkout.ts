/**
 * Workout sharing utilities.
 *
 * Supports two sharing modes:
 *  1. Share workout structure (from Home) — text summary + deep link
 *  2. Share workout results (from History) — text summary with splits + deep link
 *
 * Share links are HTTPS URLs pointing to a Supabase Edge Function that
 * serves a landing page. The page lets recipients open the workout in the
 * app (via deep link) or download from the App Store / Play Store.
 *
 * Falls back to a legacy `pacecue://` deep link with base64-encoded data
 * if the Supabase upload fails.
 */

import { Share, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  WorkoutDefinition,
  WorkoutRepeatBlock,
  CompletedWorkout,
  IntervalSplit,
  flattenWorkout,
  formatTime,
  generateId,
} from '../workout/workoutTypes';
import { track } from '../analytics/track';
import { supabase } from '../analytics/supabaseClient';

// ── Helpers ──────────────────────────────────────────────────────────

const METERS_PER_MILE = 1609.344;

/** Get the correct URL scheme for the current app variant. */
function getScheme(): string {
  const variant = Constants.expoConfig?.extra?.appVariant as string | undefined;
  if (variant === 'development') return 'pacecue-dev';
  if (variant === 'preview') return 'pacecue-preview';
  return 'pacecue';
}

/** Format a pace value (min/mile float) into MM:SS string. */
function formatPace(paceMinutes: number | null | undefined): string {
  if (paceMinutes == null || !isFinite(paceMinutes)) return '--:--';
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format a duration in seconds to a human-readable short form (e.g. "3:00"). */
function fmtDur(seconds: number): string {
  return formatTime(seconds);
}

/** Format distance in meters to a display string. */
function formatDistance(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  if (miles >= 0.1) return `${miles.toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Capitalize first letter. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Text Formatting ──────────────────────────────────────────────────

/** Describe a single repeat block in human-readable form. */
function describeBlock(block: WorkoutRepeatBlock): string {
  const parts = block.intervals.map((i) => {
    const label = i.label || cap(i.type);
    return `${fmtDur(i.durationSeconds)} ${label}`;
  });
  const joined = parts.join(' → ');
  if (block.repeatCount > 1) {
    return `${block.repeatCount}× (${joined})`;
  }
  return joined;
}

/** Label for a workout phase. */
function phaseLabel(phase: 'warmup' | 'blocks' | 'cooldown'): string {
  switch (phase) {
    case 'warmup':
      return 'Warm-up';
    case 'blocks':
      return 'Main Sets';
    case 'cooldown':
      return 'Cooldown';
  }
}

/**
 * Generate a human-readable text summary of a workout definition.
 */
export function formatWorkoutText(def: WorkoutDefinition): string {
  const intervals = flattenWorkout(def);
  const totalSecs = intervals.reduce((s, i) => s + i.durationSeconds, 0);

  const lines: string[] = [
    `${def.name} — PaceCue Workout`,
    '',
    `${fmtDur(totalSecs)} total · ${intervals.length} interval${intervals.length !== 1 ? 's' : ''}`,
    '',
  ];

  if (def.warmup.length > 0) {
    const warmupLines = def.warmup.map((b) => `${phaseLabel('warmup')}: ${describeBlock(b)}`);
    lines.push(...warmupLines);
  }

  if (def.blocks.length > 0) {
    const blockLines = def.blocks.map((b) => `${phaseLabel('blocks')}: ${describeBlock(b)}`);
    lines.push(...blockLines);
  }

  if (def.cooldown.length > 0) {
    const cdLines = def.cooldown.map((b) => `${phaseLabel('cooldown')}: ${describeBlock(b)}`);
    lines.push(...cdLines);
  }

  return lines.join('\n');
}

/**
 * Generate a text summary of completed workout results.
 */
export function formatResultsText(
  completed: CompletedWorkout,
  splits?: IntervalSplit[],
): string {
  const date = new Date(completed.completedAt);
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const totalSec = Math.floor(completed.totalDurationMs / 1000);

  const lines: string[] = [
    `Results — ${dateStr}`,
    '',
  ];

  const summaryParts = [`${fmtDur(totalSec)} total`];
  if (completed.totalDistanceMeters && completed.totalDistanceMeters > 0) {
    summaryParts.push(formatDistance(completed.totalDistanceMeters));
  }
  lines.push(summaryParts.join(' · '));

  const useSplits = splits ?? completed.splits;
  if (useSplits && useSplits.length > 0) {
    lines.push('');
    lines.push('Splits:');
    for (let i = 0; i < useSplits.length; i++) {
      const s = useSplits[i];
      const actualSec = Math.floor(s.actualDurationMs / 1000);
      const label = s.label.padEnd(10);
      let line = ` ${String(i + 1).padStart(2)}. ${label} ${fmtDur(actualSec)}`;
      if (s.avgPaceMinPerMile != null && isFinite(s.avgPaceMinPerMile)) {
        line += `  ${formatPace(s.avgPaceMinPerMile)}/mi`;
      }
      lines.push(line);
    }
  }

  return lines.join('\n');
}

// ── Deep Link Encoding ───────────────────────────────────────────────

/**
 * Minimal workout shape for sharing — strips runtime-only fields.
 */
interface ShareableWorkout {
  n: string; // name
  w: WorkoutRepeatBlock[]; // warmup
  b: WorkoutRepeatBlock[]; // blocks
  c: WorkoutRepeatBlock[]; // cooldown
}

/**
 * Encode a workout definition into a deep link URL.
 * Uses a compact JSON format + base64 encoding.
 */
export function encodeWorkoutLink(def: WorkoutDefinition): string {
  const shareable: ShareableWorkout = {
    n: def.name,
    w: def.warmup,
    b: def.blocks,
    c: def.cooldown,
  };

  const json = JSON.stringify(shareable);
  const base64 = btoa(json);
  const scheme = getScheme();
  return `${scheme}://workout/import?d=${encodeURIComponent(base64)}`;
}

/**
 * Decode a deep link URL back into a WorkoutDefinition.
 * Assigns a fresh id and timestamps.
 */
export function decodeWorkoutLink(url: string): WorkoutDefinition | null {
  try {
    const match = url.match(/[?&]d=([^&]+)/);
    if (!match) return null;

    const base64 = decodeURIComponent(match[1]);
    const json = atob(base64);
    const parsed = JSON.parse(json) as ShareableWorkout;

    if (!parsed.n || !Array.isArray(parsed.b)) return null;

    const now = Date.now();
    return {
      id: generateId(),
      name: parsed.n,
      warmup: parsed.w ?? [],
      blocks: parsed.b,
      cooldown: parsed.c ?? [],
      createdAt: now,
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

// ── Short Link (Supabase) ────────────────────────────────────────────

const SHARE_BASE_URL = 'https://pacecue.dev/w';
const SHORT_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Generate a random 7-character alphanumeric code. */
function generateShortCode(): string {
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += SHORT_CODE_CHARS.charAt(Math.floor(Math.random() * SHORT_CODE_CHARS.length));
  }
  return code;
}

/**
 * Store a workout in Supabase and return an HTTPS share link.
 * The link points to an Edge Function landing page that lets recipients
 * open the workout in the app or download from the store.
 * Falls back to the legacy base64-encoded deep link if the upload fails.
 */
export async function createShareLink(def: WorkoutDefinition): Promise<string> {
  const shareable: ShareableWorkout = {
    n: def.name,
    w: def.warmup,
    b: def.blocks,
    c: def.cooldown,
  };

  const code = generateShortCode();

  try {
    const { error } = await supabase
      .from('shared_workouts')
      .insert({ code, workout_data: shareable });

    if (!error) {
      return `${SHARE_BASE_URL}/${code}`;
    }
  } catch {
    // Network failure — fall through to legacy link
  }

  return encodeWorkoutLink(def);
}

/**
 * Resolve a short code into a WorkoutDefinition by fetching from Supabase.
 */
export async function resolveShareCode(code: string): Promise<WorkoutDefinition | null> {
  try {
    const { data, error } = await supabase
      .from('shared_workouts')
      .select('workout_data')
      .eq('code', code)
      .single();

    if (error || !data) return null;

    const parsed = data.workout_data as ShareableWorkout;
    if (!parsed.n || !Array.isArray(parsed.b)) return null;

    const now = Date.now();
    return {
      id: generateId(),
      name: parsed.n,
      warmup: parsed.w ?? [],
      blocks: parsed.b,
      cooldown: parsed.c ?? [],
      createdAt: now,
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

// ── Share Actions ────────────────────────────────────────────────────

/**
 * Share a workout's structure via the native share sheet.
 * Used from the Home screen's WorkoutCard.
 */
export async function shareWorkoutStructure(
  def: WorkoutDefinition,
): Promise<void> {
  const text = formatWorkoutText(def);
  const link = await createShareLink(def);

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { message: `${text}\n\nTry it in PaceCue:`, url: link }
        : { message: `${text}\n\nTry it in PaceCue:\n${link}`, title: `${def.name} — PaceCue Workout` },
    );
    track('workout_shared', {
      workout_id: def.id,
      workout_name: def.name,
      share_type: 'structure',
    });
  } catch {
    // User cancelled or share failed — no action needed
  }
}

/**
 * Share a completed workout's results (with structure) via the native share sheet.
 * Used from the History screen.
 */
export async function shareWorkoutResults(
  def: WorkoutDefinition | null,
  completed: CompletedWorkout,
): Promise<void> {
  const parts: string[] = [];

  // Include workout structure if we have the definition
  if (def) {
    parts.push(formatWorkoutText(def));
    parts.push('');
  }

  parts.push(formatResultsText(completed));

  // Include import link if we have the definition
  let link: string | undefined;
  if (def) {
    link = await createShareLink(def);
  }

  const textBody = parts.join('\n');
  const iosMessage = link ? `${textBody}\n\nTry it in PaceCue:` : textBody;
  const androidMessage = link ? `${textBody}\n\nTry it in PaceCue:\n${link}` : textBody;

  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { message: iosMessage, ...(link ? { url: link } : {}) }
        : { message: androidMessage, title: `${completed.workoutName} Results — PaceCue` },
    );
    track('workout_shared', {
      workout_id: completed.workoutId,
      workout_name: completed.workoutName,
      share_type: 'results',
      has_definition: !!def,
    });
  } catch {
    // User cancelled or share failed
  }
}
