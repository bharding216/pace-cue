/** Premium AI voices. Ids map to ElevenLabs voices inside the voice-clips edge function. */

export interface PremiumVoice {
  id: string;
  name: string;
  description: string;
}

export const PREMIUM_VOICES: PremiumVoice[] = [
  { id: 'coach_1', name: 'SplitCue Coach', description: 'Natural AI coaching voice' },
];

export const DEFAULT_PREMIUM_VOICE_ID = PREMIUM_VOICES[0].id;
