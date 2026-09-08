/**
 * Audio cue manager for PaceCue.
 *
 * Uses expo-audio for beep tones and expo-speech for voice announcements.
 * Configured for background playback so cues work with the phone locked.
 */

import {
  setAudioModeAsync,
  createAudioPlayer,
  type AudioPlayer,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { AudioCueMode } from '../workout/workoutTypes';

let isAudioConfigured = false;

/** Configure the audio session for background playback (call once at app start). */
export async function configureAudio(): Promise<void> {
  if (isAudioConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
    isAudioConfigured = true;
  } catch (e) {
    console.warn('Failed to configure audio:', e);
  }
}

/**
 * Generate a WAV beep in memory and return a data URI.
 * Avoids needing bundled sound files — creates simple sine-wave tones.
 */
function generateBeepWav(
  frequencyHz: number,
  durationMs: number,
  sampleRate = 22050
): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2; // 16-bit mono
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fadeSamples = Math.min(numSamples * 0.05, 200);
    let envelope = 1;
    if (i < fadeSamples) envelope = i / fadeSamples;
    if (i > numSamples - fadeSamples)
      envelope = (numSamples - i) / fadeSamples;

    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * 0.7 * envelope;
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, int16, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Pre-built beep data URIs
const BEEP_HIGH = generateBeepWav(880, 200);
const BEEP_LOW = generateBeepWav(440, 200);
const BEEP_DOUBLE = generateBeepWav(1046, 150);
const BEEP_COUNTDOWN = generateBeepWav(660, 100);

// A short silent WAV that loops to keep the iOS audio session alive in
// the background. Without this, iOS suspends the JS thread between beeps
// and timers stop firing.
const SILENT_WAV = generateBeepWav(1, 1000); // 1 Hz at near-zero amplitude = silence

type CueType = 'intervalStart' | 'warning' | 'countdown' | 'workoutComplete';

const CUE_URIS: Record<CueType, string> = {
  intervalStart: BEEP_HIGH,
  warning: BEEP_LOW,
  countdown: BEEP_COUNTDOWN,
  workoutComplete: BEEP_DOUBLE,
};

let activePlayer: AudioPlayer | null = null;

// Silent looping player that keeps the audio session alive in the background.
let silentPlayer: AudioPlayer | null = null;

/** Start a silent audio loop to prevent iOS from suspending the app. */
export function startBackgroundLoop(): void {
  stopBackgroundLoop();
  try {
    silentPlayer = createAudioPlayer(
      { uri: SILENT_WAV },
      { keepAudioSessionActive: true }
    );
    silentPlayer.loop = true;
    silentPlayer.volume = 0;
    silentPlayer.play();
  } catch (e) {
    console.warn('Failed to start background audio loop:', e);
  }
}

/** Stop the silent background loop (call when workout ends). */
export function stopBackgroundLoop(): void {
  if (silentPlayer) {
    try {
      silentPlayer.release();
    } catch {}
    silentPlayer = null;
  }
}

/** Play a beep cue using expo-audio's createAudioPlayer. */
export async function playBeep(cue: CueType): Promise<void> {
  try {
    if (activePlayer) {
      try {
        activePlayer.release();
      } catch {}
    }

    activePlayer = createAudioPlayer(
      { uri: CUE_URIS[cue] },
      { keepAudioSessionActive: true }
    );
    activePlayer.play();
  } catch (e) {
    console.warn('Failed to play beep:', e);
  }
}

/** Play a double beep (for workout complete). */
export async function playDoubleBeep(): Promise<void> {
  await playBeep('workoutComplete');
  setTimeout(() => playBeep('workoutComplete'), 250);
}

// ── Voice announcements ──────────────────────────────────────────────

/** Speak a phrase using the device's text-to-speech engine. */
export function speak(text: string): void {
  try {
    // Stop any in-progress speech first so announcements don't pile up
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      rate: 1.05,
      pitch: 1.0,
    });
  } catch (e) {
    console.warn('Failed to speak:', e);
  }
}

/**
 * Build the voice announcement for an interval transition.
 *
 * Examples:
 *   "Beginning hard"
 *   "Beginning warm up"
 *   "Ending easy"
 *   "Workout complete"
 */
function announceInterval(
  cue: CueType,
  currentLabel?: string,
  previousLabel?: string
): void {
  switch (cue) {
    case 'intervalStart':
      if (currentLabel) {
        speak(`Beginning ${currentLabel}`);
      }
      break;
    case 'warning':
      if (currentLabel) {
        speak(`Ending ${currentLabel}`);
      }
      break;
    case 'workoutComplete':
      speak('Workout complete');
      break;
    // countdown ticks don't get voice — just beeps/haptics
  }
}

// ── Interval progress announcements ──────────────────────────────────

/**
 * Speak elapsed time within the current interval.
 * Only fires when audio mode includes voice.
 *
 * Examples: "1 minute passed", "1 minute 30 seconds passed",
 *           "45 seconds passed"
 */
export function speakIntervalProgress(
  elapsedSeconds: number,
  mode: AudioCueMode
): void {
  if (mode !== 'voice' && mode !== 'both') return;

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  let phrase: string;
  if (mins > 0 && secs > 0) {
    const minWord = mins === 1 ? 'minute' : 'minutes';
    phrase = `${mins} ${minWord} ${secs} seconds passed`;
  } else if (mins > 0) {
    const minWord = mins === 1 ? 'minute' : 'minutes';
    phrase = `${mins} ${minWord} passed`;
  } else {
    phrase = `${secs} seconds passed`;
  }

  speak(phrase);
}

// ── Unified cue dispatcher ───────────────────────────────────────────

export interface CueContext {
  /** The label of the interval that just started (e.g. "Hard", "Easy", "Warm Up"). */
  currentLabel?: string;
  /** The label of the interval that just ended. */
  previousLabel?: string;
}

/**
 * Play the appropriate cue(s) based on user's audio preference.
 *
 * @param cue        - Which type of cue event occurred.
 * @param mode       - User's audio preference (beeps / voice / both / silent).
 * @param context    - Optional labels for voice announcements.
 */
export async function playCue(
  cue: CueType,
  mode: AudioCueMode,
  context?: CueContext
): Promise<void> {
  if (mode === 'silent') return;

  // Beeps
  if (mode === 'beeps' || mode === 'both') {
    if (cue === 'workoutComplete') {
      await playDoubleBeep();
    } else {
      await playBeep(cue);
    }
  }

  // Voice
  if (mode === 'voice' || mode === 'both') {
    // Small delay when in 'both' mode so the beep finishes before speech
    const delay = mode === 'both' ? 300 : 0;
    if (delay > 0) {
      setTimeout(
        () => announceInterval(cue, context?.currentLabel, context?.previousLabel),
        delay
      );
    } else {
      announceInterval(cue, context?.currentLabel, context?.previousLabel);
    }
  }
}
