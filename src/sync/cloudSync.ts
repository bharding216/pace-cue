/**
 * Cloud Sync — bidirectional sync of workouts & history with Supabase.
 *
 * Strategy: last-write-wins using `updated_at` timestamps.
 * Runs automatically when the app foregrounds for authenticated users.
 *
 * Workouts and history are small JSON blobs, so we store them as JSONB
 * columns to keep the schema simple and avoid complex migrations.
 *
 * Soft deletes via `deleted_at` ensure deletions propagate correctly.
 */

import { supabase } from '../analytics/supabaseClient';
import {
  loadWorkouts,
  saveWorkouts,
  loadHistory,
} from '../workout/workoutStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutDefinition, CompletedWorkout } from '../workout/workoutTypes';

const LAST_SYNC_KEY = '@pacecue/last_sync';
const DELETED_WORKOUTS_KEY = '@pacecue/deleted_workout_ids';
const DELETED_HISTORY_KEY = '@pacecue/deleted_history_ids';

// ── Sync status ──────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

let currentStatus: SyncStatus = 'idle';
const listeners = new Set<(status: SyncStatus) => void>();

function setStatus(status: SyncStatus) {
  currentStatus = status;
  listeners.forEach((fn) => fn(status));
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(fn: (status: SyncStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Track local deletions ────────────────────────────────────

export async function trackWorkoutDeletion(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(DELETED_WORKOUTS_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(id)) {
    ids.push(id);
    await AsyncStorage.setItem(DELETED_WORKOUTS_KEY, JSON.stringify(ids));
  }
}

export async function trackHistoryDeletion(id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(DELETED_HISTORY_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(id)) {
    ids.push(id);
    await AsyncStorage.setItem(DELETED_HISTORY_KEY, JSON.stringify(ids));
  }
}

// ── Main sync ────────────────────────────────────────────────

export async function syncAll(userId: string): Promise<void> {
  if (currentStatus === 'syncing') return;

  setStatus('syncing');

  try {
    await Promise.all([
      syncWorkouts(userId),
      syncHistory(userId),
    ]);

    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    setStatus('success');
  } catch (err) {
    console.warn('Cloud sync failed:', err);
    setStatus('error');
  }
}

// ── Workout sync ─────────────────────────────────────────────

async function syncWorkouts(userId: string): Promise<void> {
  const localWorkouts = await loadWorkouts();

  // Fetch all remote workouts (including soft-deleted)
  const { data: remoteRows } = await supabase
    .from('cloud_workouts')
    .select('*')
    .eq('user_id', userId);

  const remote = (remoteRows ?? []) as CloudWorkoutRow[];
  const remoteMap = new Map(remote.map((r) => [r.workout_id, r]));

  // Load locally deleted IDs
  const deletedRaw = await AsyncStorage.getItem(DELETED_WORKOUTS_KEY);
  const locallyDeleted: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

  // Push local deletions to remote
  for (const deletedId of locallyDeleted) {
    const remoteRow = remoteMap.get(deletedId);
    if (remoteRow && !remoteRow.deleted_at) {
      await supabase
        .from('cloud_workouts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', remoteRow.id);
    }
  }

  // Merge: compare by updatedAt
  const merged: WorkoutDefinition[] = [];
  const toUpsert: { workout_id: string; data: WorkoutDefinition; updated_at: string }[] = [];

  // Process local workouts
  for (const local of localWorkouts) {
    if (locallyDeleted.includes(local.id)) continue;

    const remoteRow = remoteMap.get(local.id);

    if (!remoteRow) {
      // New local workout → push to remote
      toUpsert.push({
        workout_id: local.id,
        data: local,
        updated_at: new Date(local.updatedAt).toISOString(),
      });
      merged.push(local);
    } else if (remoteRow.deleted_at) {
      // Deleted remotely → skip (don't keep locally)
    } else {
      const localTime = local.updatedAt;
      const remoteTime = new Date(remoteRow.updated_at).getTime();

      if (localTime >= remoteTime) {
        // Local is newer → push to remote
        toUpsert.push({
          workout_id: local.id,
          data: local,
          updated_at: new Date(local.updatedAt).toISOString(),
        });
        merged.push(local);
      } else {
        // Remote is newer → use remote
        merged.push(remoteRow.data as WorkoutDefinition);
      }
    }
  }

  // Process remote-only workouts
  const localIds = new Set(localWorkouts.map((w) => w.id));
  for (const remoteRow of remote) {
    if (localIds.has(remoteRow.workout_id)) continue;
    if (remoteRow.deleted_at) continue;
    if (locallyDeleted.includes(remoteRow.workout_id)) continue;

    merged.push(remoteRow.data as WorkoutDefinition);
  }

  // Upsert to remote
  for (const row of toUpsert) {
    await supabase.from('cloud_workouts').upsert(
      {
        user_id: userId,
        workout_id: row.workout_id,
        data: row.data,
        updated_at: row.updated_at,
      },
      { onConflict: 'user_id,workout_id' },
    );
  }

  // Save merged result locally
  await saveWorkouts(merged);

  // Clear deletion tracking
  await AsyncStorage.removeItem(DELETED_WORKOUTS_KEY);
}

// ── History sync ─────────────────────────────────────────────

async function syncHistory(userId: string): Promise<void> {
  const localHistory = await loadHistory();

  const { data: remoteRows } = await supabase
    .from('cloud_history')
    .select('*')
    .eq('user_id', userId);

  const remote = (remoteRows ?? []) as CloudHistoryRow[];
  const remoteMap = new Map(remote.map((r) => [r.history_id, r]));

  // Load locally deleted IDs
  const deletedRaw = await AsyncStorage.getItem(DELETED_HISTORY_KEY);
  const locallyDeleted: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

  // Push local deletions to remote
  for (const deletedId of locallyDeleted) {
    const remoteRow = remoteMap.get(deletedId);
    if (remoteRow && !remoteRow.deleted_at) {
      await supabase
        .from('cloud_history')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', remoteRow.id);
    }
  }

  // Merge: history entries are immutable, so just union by ID
  const merged: CompletedWorkout[] = [];
  const seenIds = new Set<string>();
  const toInsert: { history_id: string; data: CompletedWorkout; completed_at: string }[] = [];

  for (const local of localHistory) {
    if (locallyDeleted.includes(local.id)) continue;
    if (seenIds.has(local.id)) continue;
    seenIds.add(local.id);

    const remoteRow = remoteMap.get(local.id);

    if (!remoteRow) {
      toInsert.push({
        history_id: local.id,
        data: local,
        completed_at: new Date(local.completedAt).toISOString(),
      });
    }

    if (remoteRow?.deleted_at) continue;

    merged.push(local);
  }

  // Add remote-only entries
  for (const remoteRow of remote) {
    if (seenIds.has(remoteRow.history_id)) continue;
    if (remoteRow.deleted_at) continue;
    if (locallyDeleted.includes(remoteRow.history_id)) continue;

    seenIds.add(remoteRow.history_id);
    merged.push(remoteRow.data as CompletedWorkout);
  }

  // Insert new entries to remote
  for (const row of toInsert) {
    await supabase.from('cloud_history').upsert(
      {
        user_id: userId,
        history_id: row.history_id,
        data: row.data,
        completed_at: row.completed_at,
      },
      { onConflict: 'user_id,history_id' },
    );
  }

  // Sort by completedAt descending and save locally
  merged.sort((a, b) => b.completedAt - a.completedAt);
  await AsyncStorage.setItem('@pacecue/history', JSON.stringify(merged));

  // Clear deletion tracking
  await AsyncStorage.removeItem(DELETED_HISTORY_KEY);
}

// ── Types ────────────────────────────────────────────────────

interface CloudWorkoutRow {
  id: string;
  user_id: string;
  workout_id: string;
  data: unknown;
  updated_at: string;
  deleted_at: string | null;
}

interface CloudHistoryRow {
  id: string;
  user_id: string;
  history_id: string;
  data: unknown;
  completed_at: string;
  deleted_at: string | null;
}
