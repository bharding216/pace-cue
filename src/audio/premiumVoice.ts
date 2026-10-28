/**
 * Premium (AI) voice clip cache.
 *
 * Clips are generated server-side by the voice-clips edge function,
 * cached globally in Supabase Storage, and downloaded once to the
 * device so cues play offline during a run.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { supabase } from '../analytics/supabaseClient';

/** A clip is a phrase, optionally generated with surrounding text for smoother joins. */
export type Clip = string | { text: string; previousText?: string; nextText?: string };

const BATCH_SIZE = 50;
const DOWNLOAD_CONCURRENCY = 6;
const indexStorageKey = (voiceId: string) => `@pacecue/voice_clips/${voiceId}`;

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

function toRequest(clip: Clip) {
  return typeof clip === 'string' ? { text: clip } : clip;
}

function voiceDir(voiceId: string): Directory {
  return new Directory(Paths.document, 'voice-clips', voiceId);
}

/** voiceId → clip key → local file name */
const indexes = new Map<string, Record<string, string>>();
const indexLoads = new Map<string, Promise<Record<string, string>>>();

export function loadVoiceIndex(voiceId: string): Promise<Record<string, string>> {
  let load = indexLoads.get(voiceId);
  if (!load) {
    load = AsyncStorage.getItem(indexStorageKey(voiceId))
      .then((raw) => (raw ? (JSON.parse(raw) as Record<string, string>) : {}))
      .catch(() => ({}))
      .then((index) => {
        indexes.set(voiceId, index);
        return index;
      });
    indexLoads.set(voiceId, load);
  }
  return load;
}

async function saveVoiceIndex(voiceId: string): Promise<void> {
  const index = indexes.get(voiceId);
  if (index) await AsyncStorage.setItem(indexStorageKey(voiceId), JSON.stringify(index));
}

/** Local file URI for a clip, or null if it hasn't been downloaded. Synchronous for use at cue time. */
export function getLocalClipUri(voiceId: string, clip: Clip): string | null {
  const fileName = indexes.get(voiceId)?.[clipKey(clip)];
  if (!fileName) return null;
  const file = new File(voiceDir(voiceId), fileName);
  return file.exists ? file.uri : null;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

export interface EnsureProgress {
  ready: number;
  total: number;
}

let ensureChain: Promise<unknown> = Promise.resolve();

/**
 * Make sure every clip is on the device, generating and downloading any
 * that are missing. Calls are serialized so overlapping preparations
 * don't download the same clip twice.
 */
export function ensureClips(
  voiceId: string,
  clips: Clip[],
  onProgress?: (p: EnsureProgress) => void,
): Promise<EnsureProgress> {
  const run = ensureChain.then(() => ensureClipsNow(voiceId, clips, onProgress));
  ensureChain = run.catch(() => {});
  return run;
}

async function ensureClipsNow(
  voiceId: string,
  clips: Clip[],
  onProgress?: (p: EnsureProgress) => void,
): Promise<EnsureProgress> {
  await loadVoiceIndex(voiceId);
  const index = indexes.get(voiceId)!;

  const unique = new Map<string, Clip>();
  for (const clip of clips) {
    const key = clipKey(clip);
    if (key) unique.set(key, clip);
  }
  const total = unique.size;
  const missing = [...unique.entries()].filter(([, clip]) => !getLocalClipUri(voiceId, clip));
  let ready = total - missing.length;
  onProgress?.({ ready, total });
  if (missing.length === 0) return { ready, total };

  const dir = voiceDir(voiceId);
  dir.create({ intermediates: true, idempotent: true });

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.functions.invoke('voice-clips', {
      body: { voiceId, clips: batch.map(([, clip]) => toRequest(clip)) },
    });
    if (error || data?.error) {
      throw new Error(data?.error ?? error?.message ?? 'Voice clip request failed');
    }

    const results = (data.clips ?? []) as { key: string; url: string | null }[];
    await mapLimit(results, DOWNLOAD_CONCURRENCY, async ({ key, url }) => {
      if (!url) return;
      const fileName = url.split('/').pop()!;
      try {
        await File.downloadFileAsync(url, new File(dir, fileName), { idempotent: true });
        index[key] = fileName;
        ready += 1;
        onProgress?.({ ready, total });
      } catch (e) {
        console.warn('Failed to download voice clip:', key, e);
      }
    });
    await saveVoiceIndex(voiceId);
  }

  return { ready, total };
}
