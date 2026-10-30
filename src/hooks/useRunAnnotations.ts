/**
 * Tags and notes for a saved run, written back to its history entry.
 *
 * Writes are debounced because each one rewrites the whole history in
 * AsyncStorage. Any pending write is flushed on unmount (and whenever the
 * caller calls `flush`, e.g. on blur or before navigating away), so nothing
 * typed is lost.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateHistoryEntry } from '../workout/workoutStorage';

const TAG_SAVE_DELAY_MS = 300;
const NOTES_SAVE_DELAY_MS = 800;

interface Initial {
  tags?: string[];
  notes?: string;
}

export interface RunAnnotations {
  tags: string[];
  notes: string;
  setTags: (tags: string[]) => void;
  setNotes: (notes: string) => void;
  /** Write any pending change now. */
  flush: () => void;
}

/** `initial` is only read on the first render. */
export function useRunAnnotations(entryId: string | null, initial?: Initial): RunAnnotations {
  const [tags, setTagsState] = useState<string[]>(initial?.tags ?? []);
  const [notes, setNotesState] = useState(initial?.notes ?? '');

  const latest = useRef({ tags, notes });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryIdRef = useRef(entryId);
  entryIdRef.current = entryId;

  const flush = useCallback(() => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;

    const id = entryIdRef.current;
    if (!id) return;
    const { tags: nextTags, notes: text } = latest.current;
    const trimmed = text.trim();
    updateHistoryEntry(id, (entry) => ({
      ...entry,
      tags: nextTags.length > 0 ? nextTags : undefined,
      notes: trimmed || undefined,
    })).catch(() => {});
  }, []);

  const schedule = useCallback(
    (delayMs: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [flush],
  );

  useEffect(() => flush, [flush]);

  const setTags = useCallback(
    (next: string[]) => {
      setTagsState(next);
      latest.current.tags = next;
      schedule(TAG_SAVE_DELAY_MS);
    },
    [schedule],
  );

  const setNotes = useCallback(
    (next: string) => {
      setNotesState(next);
      latest.current.notes = next;
      schedule(NOTES_SAVE_DELAY_MS);
    },
    [schedule],
  );

  return { tags, notes, setTags, setNotes, flush };
}
