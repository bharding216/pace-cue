/** A clip is a phrase, optionally generated with surrounding text for smoother joins. */
export type Clip = string | { text: string; previousText?: string; nextText?: string };

/** Must match normalize in supabase/functions/voice-clips/index.ts. */
export function normalizeClipText(text: string | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Must match clipKey in supabase/functions/voice-clips/index.ts. */
export function clipKey(clip: Clip): string {
  if (typeof clip === 'string') return normalizeClipText(clip);
  const text = normalizeClipText(clip.text);
  const prev = normalizeClipText(clip.previousText);
  const next = normalizeClipText(clip.nextText);
  return prev || next ? `${text}|${prev}|${next}` : text;
}

export function toClipRequest(clip: Clip) {
  return typeof clip === 'string' ? { text: clip } : clip;
}
