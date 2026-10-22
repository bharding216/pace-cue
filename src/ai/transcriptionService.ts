/**
 * Transcription service — sends recorded audio to the transcribe-audio
 * edge function (OpenAI Whisper API) and returns the text.
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from '../analytics/supabaseClient';

export interface TranscriptionResult {
  text: string;
}

/**
 * Transcribes an audio file at the given URI via the Supabase edge function.
 * @param uri  Local file URI (e.g. from expo-audio recorder)
 * @param mimeType  Audio MIME type (defaults to audio/m4a)
 */
export async function transcribeAudio(
  uri: string,
  mimeType: string = 'audio/m4a',
): Promise<TranscriptionResult> {
  // Read the file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: {
      audio_base64: base64,
      mime_type: mimeType,
    },
  });

  if (error) {
    const msg =
      typeof error === 'object' && 'message' in error
        ? (error as any).message
        : 'Transcription failed';
    throw new Error(msg);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return { text: data.text || '' };
}
