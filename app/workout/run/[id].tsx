/**
 * Active Workout screen — the heart of PaceCue.
 *
 * Full-screen countdown timer with big type, progress bar,
 * and start/pause/resume/skip controls.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { WorkoutDefinition, FlatInterval, formatTime, AppSettings, DEFAULT_SETTINGS } from '../../../src/workout/workoutTypes';
import { loadWorkouts, loadSettings } from '../../../src/workout/workoutStorage';
import { useWorkoutRunner } from '../../../src/hooks/useWorkoutRunner';
import { Timer } from '../../../src/components/Timer';
import { IntervalProgress } from '../../../src/components/IntervalProgress';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  intervalColor,
} from '../../../src/constants/theme';
import { hapticTap } from '../../../src/audio/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDefinition | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    Promise.all([loadWorkouts(), loadSettings()]).then(([workouts, s]) => {
      const found = workouts.find((w) => w.id === id);
      if (found) setWorkout(found);
      setSettings(s);
    });
  }, [id]);

  if (!workout) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ActiveWorkoutInner workout={workout} settings={settings} />
  );
}

function ActiveWorkoutInner({
  workout,
  settings,
}: {
  workout: WorkoutDefinition;
  settings: AppSettings;
}) {
  const router = useRouter();
  const runner = useWorkoutRunner(workout, settings);

  // Keep screen awake during workout
  useEffect(() => {
    if (settings.keepScreenOn) {
      activateKeepAwakeAsync('workout');
    }
    return () => {
      deactivateKeepAwake('workout');
    };
  }, [settings.keepScreenOn]);

  const { state } = runner;
  const color = intervalColor(runner.currentType);

  const handleStop = () => {
    Alert.alert('End Workout', 'Are you sure you want to stop?', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: () => {
          runner.stop();
        },
      },
    ]);
  };

  const handleFinishedDone = useCallback(() => {
    router.back();
  }, [router]);

  // ── IDLE state ──
  if (state.phase === 'idle') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.workoutName}>{workout.name}</Text>
        <Text style={styles.intervalCount}>
          {state.intervals.length} intervals ·{' '}
          {formatTime(
            state.intervals.reduce((s, i) => s + i.durationSeconds, 0)
          )}
        </Text>

        {/* Preview list */}
        <View style={styles.previewList}>
          {state.intervals.slice(0, 8).map((int, i) => (
            <View key={i} style={styles.previewRow}>
              <View
                style={[
                  styles.previewDot,
                  { backgroundColor: intervalColor(int.type) },
                ]}
              />
              <Text style={styles.previewLabel}>{int.label}</Text>
              <Text style={styles.previewTime}>
                {formatTime(int.durationSeconds)}
              </Text>
            </View>
          ))}
          {state.intervals.length > 8 && (
            <Text style={styles.previewMore}>
              +{state.intervals.length - 8} more intervals
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.bigStartBtn}
          onPress={() => {
            hapticTap();
            runner.start();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.bigStartText}>▶  START RUN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── FINISHED state ──
  if (state.phase === 'finished') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.doneIcon}>🎉</Text>
        <Text style={styles.doneTitle}>Workout Complete!</Text>
        <Text style={styles.doneWorkoutName}>{workout.name}</Text>
        <Text style={styles.doneDuration}>
          {formatTime(Math.floor(state.totalElapsedMs / 1000))}
        </Text>
        <Text style={styles.doneSubtext}>Total time</Text>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={handleFinishedDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── RUNNING / PAUSED state ──
  return (
    <View style={[styles.container, { borderTopColor: color, borderTopWidth: 4 }]}>
      {/* Top info bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>{workout.name}</Text>
        <Text style={styles.topBarText}>{runner.intervalNumber}</Text>
      </View>

      {/* Main timer */}
      <View style={styles.timerArea}>
        <Timer
          remainingSeconds={runner.remaining}
          intervalType={runner.currentType}
          label={runner.currentLabel}
        />
      </View>

      {/* Progress bar */}
      <View style={styles.progressArea}>
        <IntervalProgress
          progress={runner.progress}
          intervalType={runner.currentType}
        />
      </View>

      {/* Workout timeline */}
      <WorkoutTimeline
        intervals={state.intervals}
        currentIndex={state.currentIndex}
      />

      {/* Total remaining */}
      <Text style={styles.totalRemaining}>
        {formatTime(runner.totalRemaining)} remaining
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Stop */}
        <TouchableOpacity
          style={[styles.controlBtn, styles.stopBtn]}
          onPress={() => {
            hapticTap();
            handleStop();
          }}
        >
          <Text style={styles.controlBtnText}>■</Text>
        </TouchableOpacity>

        {/* Play / Pause */}
        {state.phase === 'running' ? (
          <TouchableOpacity
            style={[styles.controlBtn, styles.mainBtn]}
            onPress={() => {
              hapticTap();
              runner.pause();
            }}
          >
            <Text style={styles.mainBtnText}>❚❚</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlBtn, styles.mainBtn, { backgroundColor: Colors.primary }]}
            onPress={() => {
              hapticTap();
              runner.resume();
            }}
          >
            <Text style={[styles.mainBtnText, { color: Colors.black }]}>▶</Text>
          </TouchableOpacity>
        )}

        {/* Skip */}
        <TouchableOpacity
          style={[styles.controlBtn, styles.skipBtn]}
          onPress={() => {
            hapticTap();
            runner.skip();
          }}
        >
          <Text style={styles.controlBtnText}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Workout Timeline ─────────────────────────────────────────────────

function WorkoutTimeline({
  intervals,
  currentIndex,
}: {
  intervals: FlatInterval[];
  currentIndex: number;
}) {
  const flatListRef = useRef<FlatList<FlatInterval>>(null);

  useEffect(() => {
    if (flatListRef.current && currentIndex >= 0 && currentIndex < intervals.length) {
      try {
        flatListRef.current.scrollToIndex({
          index: Math.max(0, currentIndex - 1),
          animated: true,
          viewPosition: 0.3,
        });
      } catch {}
    }
  }, [currentIndex, intervals.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: FlatInterval; index: number }) => {
      const isCompleted = index < currentIndex;
      const isCurrent = index === currentIndex;

      return (
        <View
          style={[
            tlStyles.row,
            isCurrent && tlStyles.currentRow,
          ]}
        >
          {/* Status indicator */}
          {isCompleted ? (
            <Text style={tlStyles.checkIcon}>✓</Text>
          ) : isCurrent ? (
            <Text style={tlStyles.playIcon}>▶</Text>
          ) : (
            <View
              style={[
                tlStyles.dot,
                { backgroundColor: intervalColor(item.type) + '66' },
              ]}
            />
          )}

          {/* Label with optional block name */}
          <Text
            style={[
              tlStyles.label,
              isCompleted && tlStyles.completedText,
              isCurrent && { color: intervalColor(item.type) },
            ]}
            numberOfLines={1}
          >
            {item.blockName && item.isFirstInSet
              ? `${item.blockName} · ${item.label}`
              : item.label}
          </Text>

          {/* Set indicator */}
          {item.totalSets > 1 && item.isFirstInSet && (
            <Text
              style={[
                tlStyles.setTag,
                isCompleted && tlStyles.completedText,
                isCurrent && { color: intervalColor(item.type) },
              ]}
            >
              {item.setNumber}/{item.totalSets}
            </Text>
          )}

          {/* Duration */}
          <Text
            style={[
              tlStyles.time,
              isCompleted && tlStyles.completedText,
              isCurrent && { color: intervalColor(item.type) },
            ]}
          >
            {formatTime(item.durationSeconds)}
          </Text>
        </View>
      );
    },
    [currentIndex],
  );

  return (
    <View style={tlStyles.container}>
      <FlatList
        ref={flatListRef}
        data={intervals}
        renderItem={renderItem}
        keyExtractor={(item) => item.index.toString()}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: 32,
          offset: 32 * index,
          index,
        })}
        onScrollToIndexFailed={() => {}}
        initialScrollIndex={Math.max(0, currentIndex - 1)}
      />
    </View>
  );
}

const tlStyles = StyleSheet.create({
  container: {
    maxHeight: 160,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  currentRow: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkIcon: {
    fontSize: 12,
    color: Colors.primary,
    width: 14,
    textAlign: 'center',
  },
  playIcon: {
    fontSize: 10,
    color: Colors.primary,
    width: 14,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  setTag: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
  completedText: {
    color: Colors.textMuted,
    opacity: 0.5,
  },
});

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // ── Idle ──
  workoutName: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  intervalCount: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  previewList: {
    width: '100%',
    maxWidth: 320,
    marginBottom: Spacing.xl,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  previewTime: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  previewMore: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  bigStartBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  bigStartText: {
    color: Colors.black,
    fontSize: FontSize.xl,
    fontWeight: '900',
    letterSpacing: 1,
  },
  backBtn: {
    padding: Spacing.md,
  },
  backBtnText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },

  // ── Running / Paused ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  topBarText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  timerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressArea: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  totalRemaining: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  controlBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  stopBtn: {
    width: 56,
    height: 56,
    backgroundColor: Colors.surface,
  },
  mainBtn: {
    width: 80,
    height: 80,
    backgroundColor: Colors.surface,
  },
  skipBtn: {
    width: 56,
    height: 56,
    backgroundColor: Colors.surface,
  },
  controlBtnText: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  mainBtnText: {
    fontSize: 28,
    color: Colors.textPrimary,
  },

  // ── Finished ──
  doneIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  doneTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  doneWorkoutName: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  doneDuration: {
    fontSize: FontSize.timer,
    fontWeight: '200',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  doneSubtext: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.lg,
  },
  doneBtnText: {
    color: Colors.black,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
});
