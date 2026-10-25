/**
 * Active Workout screen — the heart of SplitCue.
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
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  WorkoutDefinition,
  FlatInterval,
  formatTime,
  AppSettings,
  DEFAULT_SETTINGS,
  AudioCueMode,
  TimeRemainingInterval,
  isDistanceInterval,
  formatDistanceShort,
  hasDistanceFeature,
} from '../../../src/workout/workoutTypes';
import type { PaceCueFrequency } from '../../../src/pace/paceTypes';
import { loadWorkouts, loadSettings, saveSettings } from '../../../src/workout/workoutStorage';
import { getTempWorkout, clearTempWorkout } from '../../../src/workout/tempWorkoutCache';
import { useWorkoutRunner } from '../../../src/hooks/useWorkoutRunner';
import { Timer } from '../../../src/components/Timer';
import { IntervalProgress } from '../../../src/components/IntervalProgress';
import { formatPaceDisplay, formatDistance } from '../../../src/pace/paceTracker';
import { currentInterval as getCurrentInterval } from '../../../src/workout/workoutEngine';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  intervalColor,
} from '../../../src/constants/theme';
import { hapticTap } from '../../../src/audio/haptics';
import { setDuckingEnabled, setVoiceIdentifier } from '../../../src/audio/audioManager';
import { TagPicker } from '../../../src/components/TagPicker';
import { PreRunSettings } from '../../../src/components/PreRunSettings';
import { ContextualProPrompt } from '../../../src/components/ContextualProPrompt';
import { RouteMap } from '../../../src/components/RouteMap';
import { NewRecordsBanner } from '../../../src/components/PersonalBests';
import { updateHistoryEntry, loadHistory } from '../../../src/workout/workoutStorage';
import { detectNewRecords, detectNewAwards, computeStats } from '../../../src/stats/personalRecords';
import type { PersonalRecord, AwardBadge } from '../../../src/stats/personalRecords';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDefinition | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const cached = getTempWorkout(id!);
    if (cached) {
      clearTempWorkout(id!);
      setWorkout(cached);
      loadSettings().then(setSettings);
    } else {
      Promise.all([loadWorkouts(), loadSettings()]).then(([workouts, s]) => {
        const found = workouts.find((w) => w.id === id);
        if (found) setWorkout(found);
        setSettings(s);
      });
    }
  }, [id]);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
    if ('duckOtherAudio' in partial) {
      setDuckingEnabled(next.duckOtherAudio);
    }
    if ('voiceIdentifier' in partial) {
      setVoiceIdentifier(next.voiceIdentifier);
    }
  }, [settings]);

  if (!workout) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ActiveWorkoutInner
      workout={workout}
      settings={settings}
      onUpdateSettings={updateSettings}
    />
  );
}

function ActiveWorkoutInner({
  workout,
  settings,
  onUpdateSettings,
}: {
  workout: WorkoutDefinition;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}) {
  const router = useRouter();
  const runner = useWorkoutRunner(workout, settings);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newRecords, setNewRecords] = useState<PersonalRecord[]>([]);
  const [newAwards, setNewAwards] = useState<AwardBadge[]>([]);
  const [allRecords, setAllRecords] = useState<PersonalRecord[]>([]);

  const { state } = runner;

  // Detect new personal records when the workout finishes
  useEffect(() => {
    if (state.phase !== 'finished' || !runner.completedEntryId) return;
    loadHistory().then((history) => {
      const records = detectNewRecords(history, runner.completedEntryId!);
      const awards = detectNewAwards(history, runner.completedEntryId!);
      setNewRecords(records);
      setNewAwards(awards);
      setAllRecords(computeStats(history).records);
    }).catch(() => {});
  }, [state.phase, runner.completedEntryId]);

  // Save tags to the completed history entry whenever they change
  useEffect(() => {
    if (
      state.phase !== 'finished' ||
      !runner.completedEntryId ||
      selectedTags.length === 0
    ) return;

    updateHistoryEntry(runner.completedEntryId, (entry) => ({
      ...entry,
      tags: selectedTags,
    })).catch(() => {});
  }, [selectedTags, runner.completedEntryId, state.phase]);

  // Keep screen awake during workout
  useEffect(() => {
    if (settings.keepScreenOn) {
      activateKeepAwakeAsync('workout');
    }
    return () => {
      deactivateKeepAwake('workout');
    };
  }, [settings.keepScreenOn]);

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
    router.dismissAll();
    router.navigate('/(tabs)/history');
  }, [router]);

  // ── IDLE state ──
  if (state.phase === 'idle') {
    // Group intervals by blockNumber for section headers
    const sections: {
      blockNumber: number;
      blockName?: string;
      totalSets: number;
      firstType: string;
      intervals: FlatInterval[];
    }[] = [];
    for (const int of state.intervals) {
      const last = sections[sections.length - 1];
      if (!last || last.blockNumber !== int.blockNumber) {
        sections.push({
          blockNumber: int.blockNumber,
          blockName: int.blockName,
          totalSets: int.totalSets,
          firstType: int.type,
          intervals: [int],
        });
      } else {
        last.intervals.push(int);
      }
    }

    return (
      <View style={styles.idleContainer}>
        {/* Static header */}
        <View style={styles.idleHeader}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.intervalCount}>
            {state.intervals.length} intervals
            {workout.targetDistanceMeters
              ? ` · ${formatDistanceShort(workout.targetDistanceMeters, settings.paceUnit)} goal`
              : ` · ${formatTime(state.intervals.reduce((s, i) => s + i.durationSeconds, 0))}`
            }
          </Text>
          {hasDistanceFeature(workout) && (
            <Text style={styles.gpsNote}>📍 GPS will auto-enable for distance-based runs</Text>
          )}
        </View>

        {/* Scrollable workout preview */}
        <ScrollView
          style={styles.idleScroll}
          contentContainerStyle={styles.idleScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section) => {
            const sectionColor = intervalColor(section.firstType);
            const sectionLabel =
              section.blockName ||
              section.firstType.charAt(0).toUpperCase() + section.firstType.slice(1);

            return (
              <View key={section.blockNumber} style={styles.sectionBlock}>
                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionAccent, { backgroundColor: sectionColor }]} />
                  <Text style={styles.sectionTitle}>{sectionLabel}</Text>
                  {section.totalSets > 1 && (
                    <View style={styles.sectionRepeatBadge}>
                      <Text style={styles.sectionRepeatText}>×{section.totalSets}</Text>
                    </View>
                  )}
                </View>

                {/* Intervals in this section */}
                {section.intervals.map((int) => (
                  <React.Fragment key={int.index}>
                    {/* Set divider for repeats */}
                    {int.isFirstInSet && int.setNumber > 1 && (
                      <View style={styles.setDivider}>
                        <View style={styles.setDividerLine} />
                        <Text style={styles.setDividerText}>
                          Set {int.setNumber}
                        </Text>
                        <View style={styles.setDividerLine} />
                      </View>
                    )}
                    <View style={styles.previewRow}>
                      <View
                        style={[
                          styles.previewDot,
                          { backgroundColor: intervalColor(int.type) },
                        ]}
                      />
                      <Text style={styles.previewLabel}>{int.label}</Text>
                      <Text style={styles.previewTime}>
                        {isDistanceInterval(int)
                          ? formatDistanceShort(int.distanceMeters!, settings.paceUnit)
                          : formatTime(int.durationSeconds)}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            );
          })}
        </ScrollView>

        {/* Static footer */}
        <View style={styles.idleFooter}>
          <PreRunSettings
            settings={settings}
            onUpdate={onUpdateSettings}
            hasDistanceFeature={hasDistanceFeature(workout)}
          />
          <TouchableOpacity
            style={styles.bigStartBtn}
            onPress={() => {
              hapticTap();
              runner.start();
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="play" size={22} color={Colors.black} />
              <Text style={styles.bigStartText}>START RUN</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="arrow-back" size={16} color={Colors.textMuted} />
              <Text style={styles.backBtnText}>Back</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── FINISHED state ──
  if (state.phase === 'finished') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.finishedContent}
        showsVerticalScrollIndicator={false}
      >
        <Ionicons name="trophy" size={64} color={Colors.primary} style={styles.doneIcon} />
        <Text style={styles.doneTitle}>Workout Complete!</Text>
        <Text style={styles.doneWorkoutName}>{workout.name}</Text>

        {/* New records and awards celebration */}
        <NewRecordsBanner records={newRecords} awards={newAwards} />

        <View style={styles.doneStatBlock}>
          <Text style={styles.doneStatLabel}>Total time</Text>
          <Text style={styles.doneDuration}>
            {formatTime(Math.floor(state.totalElapsedMs / 1000))}
          </Text>
        </View>

        {settings.paceTrackingEnabled &&
          runner.paceState.totalDistanceMeters > 0 && (
            <View style={styles.doneStatBlock}>
              <Text style={styles.doneStatLabel}>Distance</Text>
              <Text style={styles.doneDistance}>
                {formatDistance(
                  runner.paceState.totalDistanceMeters,
                  settings.paceUnit,
                )}
              </Text>
            </View>
          )}

        {/* Route map with PB markers */}
        {runner.completedRoute && runner.completedRoute.length >= 2 && (
          <View style={styles.routeMapSection}>
            <RouteMap
              route={runner.completedRoute}
              splits={runner.completedSplits ?? undefined}
              paceUnit={settings.paceUnit}
              height={280}
              records={allRecords}
            />
          </View>
        )}

        {/* Tag picker */}
        <View style={styles.tagSection}>
          <Text style={styles.tagSectionTitle}>Tag this workout</Text>
          <Text style={styles.tagSectionHint}>
            How was your run? Add tags so you can look back later.
          </Text>
          <TagPicker selected={selectedTags} onChange={setSelectedTags} />
        </View>

        {/* Post-workout AI analysis teaser */}
        <ContextualProPrompt
          momentId="post_workout_analysis"
          onUpgrade={() => router.push('/paywall' as any)}
        />

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={handleFinishedDone}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={20} color={Colors.black} />
            <Text style={styles.doneBtnText}>View History</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── RUNNING / PAUSED state ──
  return (
    <View style={[styles.container, { borderTopColor: color, borderTopWidth: 4 }]}>
      {/* Top info bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>{workout.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={styles.topBarText}>{runner.intervalNumber}</Text>
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              setSettingsVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mid-run settings sheet */}
      <MidRunSettingsSheet
        visible={settingsVisible}
        settings={settings}
        onUpdate={onUpdateSettings}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Main timer — or distance display for distance-based intervals */}
      <View style={styles.timerArea}>
        {runner.isDistanceInterval ? (
          <View style={styles.distanceTimerArea}>
            <Text style={styles.distLabel}>{runner.currentLabel}</Text>
            <Text style={[styles.distRemaining, { color }]}>
              {formatDistanceShort(runner.intervalDistanceRemaining ?? 0, settings.paceUnit)}
            </Text>
            <Text style={styles.distSubLabel}>remaining</Text>
            {/* Also show elapsed time for distance intervals */}
            <Text style={styles.distElapsed}>
              {formatTime(Math.floor((Date.now() - state.startedAt) / 1000))} elapsed
            </Text>
          </View>
        ) : (
          <Timer
            remainingSeconds={runner.remaining}
            intervalType={runner.currentType}
            label={runner.currentLabel}
          />
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressArea}>
        <IntervalProgress
          progress={runner.progress}
          intervalType={runner.currentType}
        />
      </View>

      {/* Workout distance target progress */}
      {runner.workoutDistanceTarget != null && (
        <View style={styles.distTargetBar}>
          <View style={styles.distTargetInfo}>
            <Text style={styles.distTargetLabel}>DISTANCE GOAL</Text>
            <Text style={styles.distTargetValue}>
              {formatDistanceShort(runner.paceState.totalDistanceMeters, settings.paceUnit)}
              {' / '}
              {formatDistanceShort(runner.workoutDistanceTarget, settings.paceUnit)}
            </Text>
          </View>
          <View style={styles.distProgressTrack}>
            <View
              style={[
                styles.distProgressFill,
                {
                  width: `${Math.min(100, (runner.paceState.totalDistanceMeters / runner.workoutDistanceTarget) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Pace display (when tracking) */}
      {(settings.paceTrackingEnabled || hasDistanceFeature(workout)) && runner.isPaceTracking && (
        <PaceDisplay
          paceState={runner.paceState}
          paceUnit={settings.paceUnit}
          targetPace={getCurrentInterval(state)?.targetPace}
        />
      )}

      {/* Workout timeline */}
      <WorkoutTimeline
        intervals={state.intervals}
        currentIndex={state.currentIndex}
      />

      {/* Total remaining */}
      <Text style={styles.totalRemaining}>
        {runner.workoutDistanceTarget != null && runner.workoutDistanceRemaining != null
          ? `${formatDistanceShort(runner.workoutDistanceRemaining, settings.paceUnit)} to go`
          : `${formatTime(runner.totalRemaining)} remaining`
        }
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
          <Ionicons name="stop" size={22} color={Colors.textPrimary} />
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
            <Ionicons name="pause" size={32} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlBtn, styles.mainBtn, { backgroundColor: Colors.primary }]}
            onPress={() => {
              hapticTap();
              runner.resume();
            }}
          >
            <Ionicons name="play" size={32} color={Colors.black} />
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
          <Ionicons name="play-skip-forward" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Mid-Run Settings Sheet ────────────────────────────────────────────

const AUDIO_MODES: {
  value: AudioCueMode;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'beeps', label: 'Beeps', icon: 'notifications-outline' },
  { value: 'voice', label: 'Voice', icon: 'volume-high-outline' },
  { value: 'both', label: 'Both', icon: 'volume-medium-outline' },
  { value: 'silent', label: 'Silent', icon: 'volume-mute-outline' },
];

const WARNING_OPTIONS = [3, 5, 10, 15, 30];

const PACE_CUE_OPTIONS: { value: PaceCueFrequency; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
];

const TIME_ANNOUNCE_OPTIONS: { value: TimeRemainingInterval; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
];

function MidRunSettingsSheet({
  visible,
  settings,
  onUpdate,
  onClose,
}: {
  visible: boolean;
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={sheetStyles.overlay}>
        <TouchableOpacity style={sheetStyles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={sheetStyles.sheet}>
          {/* Handle */}
          <View style={sheetStyles.handleRow}>
            <View style={sheetStyles.handle} />
          </View>

          {/* Header */}
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.headerTitle}>Settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={sheetStyles.scrollView}
            contentContainerStyle={sheetStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Audio Mode */}
            <Text style={sheetStyles.sectionTitle}>Audio Cues</Text>
            <View style={sheetStyles.chipRow}>
              {AUDIO_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    sheetStyles.chip,
                    settings.audioCueMode === mode.value && sheetStyles.chipActive,
                  ]}
                  onPress={() => {
                    hapticTap();
                    onUpdate({ audioCueMode: mode.value });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mode.icon}
                    size={14}
                    color={
                      settings.audioCueMode === mode.value
                        ? Colors.primary
                        : Colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      sheetStyles.chipLabel,
                      settings.audioCueMode === mode.value && sheetStyles.chipLabelActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duck other audio */}
            {settings.audioCueMode !== 'silent' && (
              <View style={sheetStyles.toggleRow}>
                <Text style={sheetStyles.toggleLabel}>Lower music during cues</Text>
                <Switch
                  value={settings.duckOtherAudio}
                  onValueChange={(v) => {
                    hapticTap();
                    onUpdate({ duckOtherAudio: v });
                  }}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
                  thumbColor={Colors.white}
                />
              </View>
            )}

            {/* Haptic */}
            <View style={sheetStyles.toggleRow}>
              <Text style={sheetStyles.toggleLabel}>Haptic feedback</Text>
              <Switch
                value={settings.hapticEnabled}
                onValueChange={(v) => {
                  if (v) hapticTap();
                  onUpdate({ hapticEnabled: v });
                }}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
                thumbColor={Colors.white}
              />
            </View>

            {/* Countdown Warnings */}
            <Text style={sheetStyles.sectionTitle}>Countdown Warnings</Text>
            <View style={sheetStyles.chipRow}>
              {WARNING_OPTIONS.map((sec) => {
                const isSelected = settings.countdownWarningSeconds.includes(sec);
                return (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      sheetStyles.chip,
                      isSelected && sheetStyles.chipActive,
                    ]}
                    onPress={() => {
                      hapticTap();
                      let next: number[];
                      if (isSelected) {
                        next = settings.countdownWarningSeconds.filter((s) => s !== sec);
                      } else {
                        next = [...settings.countdownWarningSeconds, sec].sort((a, b) => a - b);
                      }
                      if (next.length === 0) return;
                      onUpdate({ countdownWarningSeconds: next });
                    }}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={12} color={Colors.primary} />
                    )}
                    <Text
                      style={[
                        sheetStyles.chipLabel,
                        isSelected && sheetStyles.chipLabelActive,
                      ]}
                    >
                      {sec}s
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Interval Progress */}
            <Text style={sheetStyles.sectionTitle}>Interval Progress</Text>
            <Text style={sheetStyles.sectionSub}>Announce elapsed time during intervals</Text>
            <View style={sheetStyles.chipRow}>
              {TIME_ANNOUNCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    sheetStyles.chip,
                    settings.timeRemainingInterval === opt.value && sheetStyles.chipActive,
                  ]}
                  onPress={() => {
                    hapticTap();
                    onUpdate({ timeRemainingInterval: opt.value });
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      sheetStyles.chipLabel,
                      settings.timeRemainingInterval === opt.value && sheetStyles.chipLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pace Tracking */}
            <Text style={sheetStyles.sectionTitle}>Pace</Text>
            <View style={sheetStyles.toggleRow}>
              <Text style={sheetStyles.toggleLabel}>GPS pace tracking</Text>
              <Switch
                value={settings.paceTrackingEnabled}
                onValueChange={(v) => {
                  hapticTap();
                  onUpdate({ paceTrackingEnabled: v });
                }}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
                thumbColor={Colors.white}
              />
            </View>

            {settings.paceTrackingEnabled && (
              <>
                {/* Pace unit */}
                <View style={sheetStyles.chipRow}>
                  <TouchableOpacity
                    style={[
                      sheetStyles.chip,
                      settings.paceUnit === 'minPerMile' && sheetStyles.chipActive,
                    ]}
                    onPress={() => {
                      hapticTap();
                      onUpdate({ paceUnit: 'minPerMile' });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        sheetStyles.chipLabel,
                        settings.paceUnit === 'minPerMile' && sheetStyles.chipLabelActive,
                      ]}
                    >
                      min/mile
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      sheetStyles.chip,
                      settings.paceUnit === 'minPerKm' && sheetStyles.chipActive,
                    ]}
                    onPress={() => {
                      hapticTap();
                      onUpdate({ paceUnit: 'minPerKm' });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        sheetStyles.chipLabel,
                        settings.paceUnit === 'minPerKm' && sheetStyles.chipLabelActive,
                      ]}
                    >
                      min/km
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Pace cue frequency */}
                <Text style={sheetStyles.sectionSub}>Pace cue frequency</Text>
                <View style={sheetStyles.chipRow}>
                  {PACE_CUE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        sheetStyles.chip,
                        settings.paceCueFrequency === opt.value && sheetStyles.chipActive,
                      ]}
                      onPress={() => {
                        hapticTap();
                        onUpdate({ paceCueFrequency: opt.value });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          sheetStyles.chipLabel,
                          settings.paceCueFrequency === opt.value && sheetStyles.chipLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Only cue on intervals with target pace */}
                {settings.paceCueFrequency > 0 && (
                  <View style={sheetStyles.toggleRow}>
                    <Text style={sheetStyles.toggleLabel}>Only with target pace</Text>
                    <Switch
                      value={settings.paceCueOnlyWithTarget}
                      onValueChange={(v) => {
                        hapticTap();
                        onUpdate({ paceCueOnlyWithTarget: v });
                      }}
                      trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
                      thumbColor={Colors.white}
                    />
                  </View>
                )}
              </>
            )}

            {/* Keep screen on */}
            <Text style={sheetStyles.sectionTitle}>Display</Text>
            <View style={sheetStyles.toggleRow}>
              <Text style={sheetStyles.toggleLabel}>Keep screen on</Text>
              <Switch
                value={settings.keepScreenOn}
                onValueChange={(v) => {
                  hapticTap();
                  onUpdate({ keepScreenOn: v });
                }}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
                thumbColor={Colors.white}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    gap: Spacing.xs,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  chipLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: Colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  toggleLabel: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.md,
  },
});

// ── Pace Display ─────────────────────────────────────────────────────

function PaceDisplay({
  paceState,
  paceUnit,
  targetPace,
}: {
  paceState: import('../../../src/pace/paceTypes').PaceState;
  paceUnit: import('../../../src/pace/paceTypes').PaceUnit;
  targetPace?: number;
}) {
  const currentPace =
    paceUnit === 'minPerMile'
      ? paceState.currentPaceMinPerMile
      : paceState.currentPaceMinPerKm;
  const unitLabel = paceUnit === 'minPerMile' ? '/mi' : '/km';
  const paceStr = formatPaceDisplay(currentPace);
  const distStr = formatDistance(paceState.totalDistanceMeters, paceUnit);

  // Determine pace status relative to target
  let statusColor: string = Colors.textSecondary;
  let statusText = '';
  if (targetPace != null && currentPace != null && isFinite(currentPace)) {
    const diff = currentPace - targetPace;
    if (Math.abs(diff) < 0.15) {
      statusColor = Colors.primary;
      statusText = 'On target';
    } else if (diff > 0) {
      statusColor = Colors.danger;
      statusText = 'Behind target';
    } else {
      statusColor = Colors.accent;
      statusText = 'Ahead of target';
    }
  }

  return (
    <View style={paceStyles.container}>
      <View style={paceStyles.mainRow}>
        <View style={paceStyles.paceCol}>
          <Text style={paceStyles.paceLabel}>PACE</Text>
          <Text style={paceStyles.paceValue}>
            {paceStr}
            <Text style={paceStyles.paceUnit}> {unitLabel}</Text>
          </Text>
        </View>
        {targetPace != null && (
          <View style={paceStyles.targetCol}>
            <Text style={paceStyles.paceLabel}>TARGET</Text>
            <Text style={[paceStyles.targetValue]}>
              {formatPaceDisplay(targetPace)}
              <Text style={paceStyles.paceUnit}> {unitLabel}</Text>
            </Text>
          </View>
        )}
        <View style={paceStyles.distCol}>
          <Text style={paceStyles.paceLabel}>DIST</Text>
          <Text style={paceStyles.distValue}>{distStr}</Text>
        </View>
      </View>
      {statusText !== '' && (
        <Text style={[paceStyles.statusText, { color: statusColor }]}>
          {statusText}
        </Text>
      )}
    </View>
  );
}

const paceStyles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  paceCol: {
    flex: 1,
  },
  targetCol: {
    flex: 1,
    alignItems: 'center',
  },
  distCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  paceLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  paceValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  targetValue: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  paceUnit: {
    fontSize: FontSize.sm,
    fontWeight: '400',
  },
  distValue: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: Spacing.xs,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

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
            <Ionicons name="checkmark" size={14} color={Colors.primary} style={tlStyles.statusIcon} />
          ) : isCurrent ? (
            <Ionicons name="play" size={12} color={Colors.primary} style={tlStyles.statusIcon} />
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

          {/* Duration or distance */}
          <Text
            style={[
              tlStyles.time,
              isCompleted && tlStyles.completedText,
              isCurrent && { color: intervalColor(item.type) },
            ]}
          >
            {isDistanceInterval(item)
              ? formatDistanceShort(item.distanceMeters!, 'minPerMile')
              : formatTime(item.durationSeconds)
            }
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
  statusIcon: {
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
  // ── Idle ──
  idleContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 100,
  },
  idleHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  idleScroll: {
    flex: 1,
  },
  idleScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  idleFooter: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.surfaceLight,
  },
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
    marginBottom: Spacing.sm,
  },
  gpsNote: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    marginBottom: Spacing.xl,
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    gap: Spacing.sm,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionRepeatBadge: {
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  sectionRepeatText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
  },
  setDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  setDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.textMuted + '44',
  },
  setDividerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
  distanceTimerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  distLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  distRemaining: {
    fontSize: FontSize.timer,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  distSubLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  distElapsed: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
    marginTop: Spacing.sm,
  },
  distTargetBar: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  distTargetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  distTargetLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  distTargetValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
  distProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  distProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.accent,
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
  finishedContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xxl * 2,
  },
  routeMapSection: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  tagSection: {
    width: '100%',
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  tagSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  tagSectionHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  doneIcon: {
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
  doneStatBlock: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  doneStatLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  doneDuration: {
    fontSize: FontSize.timer,
    fontWeight: '200',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  doneDistance: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  doneBtnText: {
    color: Colors.black,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
});
