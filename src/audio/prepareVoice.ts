/**
 * Background preparation of premium voice clips so cues play offline.
 * Never blocks a run: anything not ready falls back to device TTS.
 */

import type { AppSettings, WorkoutDefinition } from '../workout/workoutTypes';
import { loadSettings } from '../workout/workoutStorage';
import type { PaceUnit } from '../pace/paceTypes';
import { enumerateWorkoutPhrases, globalPackClips } from './cuePhrases';
import { ensureClips, type EnsureProgress } from './premiumVoice';

function usesPremiumVoice(settings: AppSettings): boolean {
  return (
    settings.voiceEngine === 'premium' &&
    (settings.audioCueMode === 'voice' || settings.audioCueMode === 'both' || settings.audioCueMode === 'beeps')
  );
}

/** Download the shared clips (pace segments, completion, distance progress) for a voice. */
export function prepareVoicePack(
  voiceId: string,
  unit: PaceUnit,
  onProgress?: (p: EnsureProgress) => void,
): Promise<EnsureProgress> {
  return ensureClips(voiceId, globalPackClips(unit), onProgress);
}

/**
 * Download every clip a workout can speak. Safe to call repeatedly; cached
 * clips are skipped. Loads saved settings when none are passed.
 */
export async function prepareWorkoutAudio(
  workout: WorkoutDefinition,
  settingsOverride?: AppSettings,
): Promise<void> {
  const settings = settingsOverride ?? (await loadSettings());
  if (!usesPremiumVoice(settings)) return;
  try {
    await ensureClips(settings.premiumVoiceId, [
      ...globalPackClips(settings.paceUnit),
      ...enumerateWorkoutPhrases(workout, settings),
    ]);
  } catch (e) {
    console.warn('Failed to prepare workout audio:', e);
  }
}
