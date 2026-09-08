/**
 * Export / Import PaceCue data as a single JSON file.
 *
 * Export: serialises workouts + history + settings → writes a temp .json
 *         file → opens the native share sheet so the user can save it
 *         anywhere (Files, iCloud, Google Drive, email, etc.).
 *
 * Import: opens the document picker → reads the selected .json file →
 *         validates the structure → replaces local storage.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  loadWorkouts,
  saveWorkouts,
  loadHistory,
  loadSettings,
  saveSettings,
} from './workoutStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WorkoutDefinition,
  CompletedWorkout,
  AppSettings,
  DEFAULT_SETTINGS,
} from './workoutTypes';

// ── Backup shape ─────────────────────────────────────────────────────

const BACKUP_VERSION = 1;

export interface PaceCueBackup {
  _pacecue: true;
  version: typeof BACKUP_VERSION;
  exportedAt: number; // epoch-ms
  workouts: WorkoutDefinition[];
  history: CompletedWorkout[];
  settings: AppSettings;
}

// ── Export ────────────────────────────────────────────────────────────

export async function exportData(): Promise<void> {
  const [workouts, history, settings] = await Promise.all([
    loadWorkouts(),
    loadHistory(),
    loadSettings(),
  ]);

  const backup: PaceCueBackup = {
    _pacecue: true,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    workouts,
    history,
    settings,
  };

  const json = JSON.stringify(backup, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `pacecue-backup-${dateStr}.json`;

  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save PaceCue Backup',
  });
}

// ── Import ───────────────────────────────────────────────────────────

export interface ImportResult {
  workoutsCount: number;
  historyCount: number;
  settingsRestored: boolean;
}

export async function importData(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null; // user cancelled
  }

  const { uri } = result.assets[0];
  const file = new File(uri);
  const raw = file.text();
  const parsed = JSON.parse(raw);

  if (!isValidBackup(parsed)) {
    throw new Error(
      "This file doesn't look like a PaceCue backup. Make sure you selected the right file."
    );
  }

  const backup = parsed as PaceCueBackup;

  // Write everything at once
  await Promise.all([
    saveWorkouts(backup.workouts),
    AsyncStorage.setItem(
      '@pacecue/history',
      JSON.stringify(backup.history)
    ),
    saveSettings(backup.settings ?? DEFAULT_SETTINGS),
  ]);

  return {
    workoutsCount: backup.workouts.length,
    historyCount: backup.history.length,
    settingsRestored: !!backup.settings,
  };
}

// ── Validation ───────────────────────────────────────────────────────

function isValidBackup(data: unknown): data is PaceCueBackup {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj._pacecue === true &&
    typeof obj.version === 'number' &&
    Array.isArray(obj.workouts)
  );
}
