/**
 * Audio cue manager for PaceCue.
 *
 * Uses expo-av to generate beep tones programmatically.
 * Designed to work with the phone locked / app backgrounded by keeping
 * an audio session active in the "playback" category.
 */

import { Audio } from 'expo-av';
import { AudioCueMode } from '../workout/workoutTypes';

let isAudioConfigured = false;

/** Configure the audio session for background playback (call once at app start). */
export async function configureAudio(): Promise<void> {
  if (isAudioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    isAudioConfigured = true;
  } catch (e) {
    console.warn('Failed to configure audio:', e);
  }
}

/**
 * Generate a WAV beep in memory.
 * This avoids needing bundled sound files — we create simple sine-wave tones.
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
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate sine wave
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Apply a short fade-in/fade-out envelope to avoid clicks
    const fadeSamples = Math.min(numSamples * 0.05, 200);
    let envelope = 1;
    if (i < fadeSamples) envelope = i / fadeSamples;
    if (i > numSamples - fadeSamples)
      envelope = (numSamples - i) / fadeSamples;

    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * 0.7 * envelope;
    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, int16, true);
  }

  // Convert to base64 data URI
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

// Pre-built beep URIs
const BEEP_HIGH = generateBeepWav(880, 200); // A5 – interval start
const BEEP_LOW = generateBeepWav(440, 200); // A4 – warning
const BEEP_DOUBLE = generateBeepWav(1046, 150); // C6 – workout complete
const BEEP_COUNTDOWN = generateBeepWav(660, 100); // E5 – 3-2-1 countdown

type CueType = 'intervalStart' | 'warning' | 'countdown' | 'workoutComplete';

const CUE_URIS: Record<CueType, string> = {
  intervalStart: BEEP_HIGH,
  warning: BEEP_LOW,
  countdown: BEEP_COUNTDOWN,
  workoutComplete: BEEP_DOUBLE,
};

/** Play a beep cue. */
export async function playBeep(cue: CueType): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: CUE_URIS[cue] },
      { shouldPlay: true, volume: 1.0 }
    );
    // Unload after playback finishes to free memory
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    console.warn('Failed to play beep:', e);
  }
}

/** Play a double beep (for workout complete). */
export async function playDoubleBeep(): Promise<void> {
  await playBeep('workoutComplete');
  setTimeout(() => playBeep('workoutComplete'), 250);
}

/** Play appropriate cue based on user's audio preference. */
export async function playCue(
  cue: CueType,
  mode: AudioCueMode
): Promise<void> {
  if (mode === 'silent') return;
  // For now we only have beeps; voice cues would be added here later
  if (mode === 'beeps' || mode === 'both') {
    if (cue === 'workoutComplete') {
      await playDoubleBeep();
    } else {
      await playBeep(cue);
    }
  }
}
