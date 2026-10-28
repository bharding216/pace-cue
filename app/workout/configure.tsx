/**
 * Configure Workout screen — session-mode editor.
 *
 * Reuses WorkoutEditorForm but does NOT auto-save to the library.
 * Primary action: Start Workout (session-only, no library write).
 * Secondary: Save Changes → Update Original or Save as New.
 *
 * Query params:
 *   - id: workout id (loaded from library or temp cache)
 *   - quickStart: QuickStartType — when present, produces a factory draft
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  WorkoutDefinition,
  generateId,
  QuickStartType,
} from '../../src/workout/workoutTypes';
import { loadWorkouts, saveWorkout } from '../../src/workout/workoutStorage';
import {
  getTempWorkout,
  getTempWorkoutMeta,
  clearTempWorkout,
  setTempWorkout,
} from '../../src/workout/tempWorkoutCache';
import type { TempWorkoutMeta } from '../../src/workout/tempWorkoutCache';
import { WorkoutEditorForm } from '../../src/components/WorkoutEditorForm';
import { quickStartFactory, loadQuickStartDefault, saveQuickStartDefault } from '../../src/workout/quickStartDefaults';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { track } from '../../src/analytics/track';
import { prepareWorkoutAudio } from '../../src/audio/prepareVoice';

export default function ConfigureWorkoutScreen() {
  const { id, quickStart } = useLocalSearchParams<{
    id?: string;
    quickStart?: QuickStartType;
  }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDefinition | null>(null);
  const [meta, setMeta] = useState<TempWorkoutMeta>({});
  const [original, setOriginal] = useState<WorkoutDefinition | null>(null);
  const latestRef = useRef<WorkoutDefinition | null>(null);

  useEffect(() => {
    if (quickStart) {
      // Try last-used defaults first, then fall back to factory
      loadQuickStartDefault(quickStart).then((saved) => {
        setWorkout(saved ?? quickStartFactory(quickStart));
      });
      setOriginal(null);
      setMeta({ quickStartType: quickStart });
      return;
    }

    if (!id) return;

    const cached = getTempWorkout(id);
    if (cached) {
      const cachedMeta = getTempWorkoutMeta(id) ?? {};
      clearTempWorkout(id);
      setWorkout(cached);
      setOriginal(cached);
      setMeta(cachedMeta);
    } else {
      loadWorkouts().then((all) => {
        const found = all.find((w) => w.id === id);
        if (found) {
          setWorkout(found);
          setOriginal(found);
          setMeta({ templateId: found.id });
        }
      });
    }
  }, [id, quickStart]);

  // Prepare voice clips for the workout as loaded; the run screen
  // prepares again with any edits made here.
  const preparedRef = useRef(false);
  useEffect(() => {
    if (!workout || preparedRef.current) return;
    preparedRef.current = true;
    prepareWorkoutAudio(workout);
  }, [workout]);

  const handleChange = useCallback((updated: WorkoutDefinition) => {
    setWorkout(updated);
    latestRef.current = updated;
  }, []);

  const handleStartWorkout = useCallback(() => {
    const w = latestRef.current ?? workout;
    if (!w) return;
    setTempWorkout(w, meta);
    track('workout_session_started', {
      workout_id: w.id,
      template_id: meta.templateId,
      plan_workout_id: meta.planWorkoutId,
      quick_start_type: meta.quickStartType,
    });
    if (meta.quickStartType) {
      saveQuickStartDefault(meta.quickStartType, w).catch(() => {});
    }
    router.push(`/workout/run/${w.id}`);
  }, [workout, meta, router]);

  const handleSaveChanges = useCallback(() => {
    const w = latestRef.current ?? workout;
    if (!w) return;
    if (!w.name.trim()) {
      Alert.alert('Name Required', 'Give your workout a name before saving.');
      return;
    }

    if (meta.templateId && original) {
      Alert.alert('Save Template', 'How would you like to save?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update Original',
          onPress: async () => {
            await saveWorkout({ ...w, id: meta.templateId!, updatedAt: Date.now() });
            track('workout_saved', { workout_id: meta.templateId!, is_copy: false });
            setOriginal(w);
          },
        },
        {
          text: 'Save as New',
          onPress: async () => {
            const newId = generateId();
            const now = Date.now();
            await saveWorkout({ ...w, id: newId, createdAt: now, updatedAt: now });
            track('workout_saved', { workout_id: newId, is_copy: true });
            setMeta((prev) => ({ ...prev, templateId: newId }));
            setOriginal({ ...w, id: newId });
          },
        },
      ]);
    } else {
      // Quick Start or plan workout without a library original — save as new
      if (!w.name.trim()) {
        Alert.alert('Name Required', 'Give your workout a name before saving.');
        return;
      }
      const newId = generateId();
      const now = Date.now();
      saveWorkout({ ...w, id: newId, name: w.name, createdAt: now, updatedAt: now })
        .then(() => {
          track('workout_saved', { workout_id: newId, is_copy: false });
          setMeta((prev) => ({ ...prev, templateId: newId }));
          setOriginal({ ...w, id: newId });
        });
    }
  }, [workout, meta, original]);

  const handleResetToSaved = useCallback(() => {
    if (original) {
      setWorkout({ ...original });
      latestRef.current = original;
    }
  }, [original]);

  const isModified = useMemo(() => {
    if (!original || !workout) return false;
    const w = latestRef.current ?? workout;
    return JSON.stringify(stripMeta(w)) !== JSON.stringify(stripMeta(original));
  }, [workout, original]);

  if (!workout) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: quickStart ? 'Quick Start' : 'Configure Run',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <WorkoutEditorForm
          initial={workout}
          autoSave={false}
          isPlanWorkout={!!meta.planWorkoutId}
          onSave={handleChange}
          onCancel={() => router.back()}
          sessionMode
          onSessionChange={handleChange}
        />

        {/* Sticky bottom actions */}
        <View style={styles.bottomBar}>
          {isModified && original && (
            <Text style={styles.modifiedText}>Modified for this run</Text>
          )}

          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStartWorkout}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={18} color={Colors.black} />
            <Text style={styles.startBtnText}>Start Workout</Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            {isModified && original && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleResetToSaved}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.secondaryBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSaveChanges}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.secondaryBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

function stripMeta(w: WorkoutDefinition) {
  const { id, createdAt, updatedAt, ...rest } = w;
  return rest;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  doneButton: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
  },
  doneButtonText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    backgroundColor: Colors.background,
  },
  modifiedText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  startBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  startBtnText: {
    color: Colors.black,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
