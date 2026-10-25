/**
 * VoiceEditSheet — bottom-sheet modal for voice-driven workout editing.
 *
 * Flow:
 *   1. User taps the mic → records voice describing the desired change
 *   2. Recording is transcribed via Whisper
 *   3. Transcription is sent to the adjust-plan edge function
 *   4. Proposed modifications are shown (date moves, label changes, etc.)
 *   5. User can apply or discard the changes
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';
import { Colors, Spacing, FontSize, BorderRadius, intervalColor } from '../constants/theme';
import { transcribeAudio } from '../ai/transcriptionService';
import { adjustPlan, type PlanAdjustmentInput, type PlanModification } from '../ai/planService';
import type { TrainingPlan, PlanWorkout } from '../types/database';
import {
  type WorkoutDefinition,
  type WorkoutRepeatBlock,
  type WorkoutInterval,
  flattenWorkout,
  totalWorkoutSeconds,
  formatTime,
} from '../workout/workoutTypes';
import { hapticTap } from '../audio/haptics';

// ── Types ────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  /** The workout being edited */
  workout: PlanWorkout;
  /** The plan this workout belongs to */
  plan: TrainingPlan;
  /** All workouts in the plan (for context) */
  planWorkouts: PlanWorkout[];
  /** Called when the user accepts the proposed changes */
  onApply: (modifications: PlanModification[]) => Promise<void>;
  onClose: () => void;
}

type Phase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'generating'
  | 'review'
  | 'applying';

// ── Sound Bars ───────────────────────────────────────────────

const BAR_COUNT = 7;

function meterToLevel(db: number | undefined): number {
  if (db === undefined || db <= -50) return 0;
  if (db >= 0) return 1;
  return (db + 50) / 50;
}

function SoundBars({ metering, isActive }: { metering?: number; isActive: boolean }) {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15)),
  ).current;
  const hasMetering = metering !== undefined && metering > -160;
  const level = meterToLevel(metering);

  useEffect(() => {
    if (!hasMetering) return;
    anims.forEach((anim, i) => {
      const offset = Math.sin(Date.now() / 200 + i * 1.5) * 0.18;
      const target = Math.max(0.1, Math.min(1, level + offset));
      Animated.timing(anim, {
        toValue: target,
        duration: 100,
        useNativeDriver: false,
      }).start();
    });
  }, [level, hasMetering, anims]);

  useEffect(() => {
    if (hasMetering || !isActive) return;
    const timers = anims.map((anim, i) => {
      const animate = (): void => {
        const duration = 180 + Math.random() * 280;
        const target = 0.2 + Math.random() * 0.8;
        Animated.timing(anim, {
          toValue: target,
          duration,
          useNativeDriver: false,
        }).start(() => {
          if (isActive) animate();
        });
      };
      return setTimeout(() => animate(), i * 60);
    });
    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.stopAnimation());
      anims.forEach((a) => a.setValue(0.15));
    };
  }, [isActive, hasMetering, anims]);

  return (
    <View style={barStyles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            barStyles.bar,
            {
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 28],
              }),
              backgroundColor: Colors.accent,
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});

// ── Workout Detail Preview ───────────────────────────────────

function intervalLabel(i: WorkoutInterval): string {
  if (i.label) return i.label;
  switch (i.type) {
    case 'warmup': return 'Warm Up';
    case 'cooldown': return 'Cool Down';
    case 'hard': return 'Hard';
    case 'easy': return 'Easy';
  }
}

function formatPace(paceMinPerMile: number): string {
  const mins = Math.floor(paceMinPerMile);
  const secs = Math.round((paceMinPerMile - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}/mi`;
}

function IntervalDetail({ interval }: { interval: WorkoutInterval }) {
  const extras: string[] = [];
  if (interval.targetPace) extras.push(formatPace(interval.targetPace));
  if (interval.effort) extras.push(`RPE ${interval.effort}`);
  if (interval.distanceMeters && interval.distanceMeters > 0) {
    const meters = interval.distanceMeters;
    extras.push(meters >= 1609 ? `${(meters / 1609.344).toFixed(2)} mi` : `${Math.round(meters)}m`);
  }

  return (
    <View style={detailStyles.intervalRow}>
      <View style={[detailStyles.dot, { backgroundColor: intervalColor(interval.type) }]} />
      <Text style={detailStyles.intervalName} numberOfLines={1}>
        {intervalLabel(interval)}
      </Text>
      {interval.durationSeconds > 0 && (
        <Text style={detailStyles.intervalTime}>{formatTime(interval.durationSeconds)}</Text>
      )}
      {extras.length > 0 && (
        <Text style={detailStyles.intervalMeta}>{extras.join(' · ')}</Text>
      )}
    </View>
  );
}

function BlockPreview({ block }: { block: WorkoutRepeatBlock }) {
  return (
    <View style={detailStyles.block}>
      {(block.repeatCount > 1 || block.name) && (
        <View style={detailStyles.blockHeader}>
          {block.name && <Text style={detailStyles.blockName}>{block.name}</Text>}
          {block.repeatCount > 1 && (
            <View style={detailStyles.repeatBadge}>
              <Text style={detailStyles.repeatText}>×{block.repeatCount}</Text>
            </View>
          )}
        </View>
      )}
      {block.intervals.map((interval, ii) => (
        <IntervalDetail key={ii} interval={interval} />
      ))}
    </View>
  );
}

function SectionBlocks({ label, blocks }: { label: string; blocks: WorkoutRepeatBlock[] }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <View style={detailStyles.section}>
      <Text style={detailStyles.sectionLabel}>{label}</Text>
      {blocks.map((block, bi) => (
        <BlockPreview key={bi} block={block} />
      ))}
    </View>
  );
}

/** Compact workout card showing interval structure, pace, effort, etc. */
function WorkoutDetailCard({
  title,
  workoutData,
  variant,
}: {
  title: string;
  workoutData: { name: string; warmup: unknown[]; blocks: unknown[]; cooldown: unknown[] };
  variant: 'before' | 'after';
}) {
  const wd = workoutData as WorkoutDefinition;
  const flat = flattenWorkout(wd);
  const totalSec = totalWorkoutSeconds(wd);

  const borderColor = variant === 'before' ? Colors.textMuted + '40' : Colors.primary + '60';
  const titleColor = variant === 'before' ? Colors.textMuted : Colors.primary;

  return (
    <View style={[detailStyles.card, { borderColor }]}>
      <Text style={[detailStyles.cardTitle, { color: titleColor }]}>{title}</Text>
      <Text style={detailStyles.cardName}>{wd.name}</Text>
      <Text style={detailStyles.cardSummary}>
        {formatTime(totalSec)} total · {flat.length} interval{flat.length !== 1 ? 's' : ''}
      </Text>
      <SectionBlocks label="WARM UP" blocks={wd.warmup as WorkoutRepeatBlock[]} />
      <SectionBlocks label="INTERVALS" blocks={wd.blocks as WorkoutRepeatBlock[]} />
      <SectionBlocks label="COOL DOWN" blocks={wd.cooldown as WorkoutRepeatBlock[]} />
    </View>
  );
}

const detailStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.xs - 1,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSummary: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  section: {
    marginTop: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  block: {
    backgroundColor: Colors.background + '80',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs + 2,
    marginBottom: 4,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  blockName: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  repeatBadge: {
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  repeatText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  intervalName: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  intervalTime: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  intervalMeta: {
    fontSize: FontSize.xs - 1,
    color: Colors.accent,
    fontWeight: '600',
  },
});

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Main Component ──────────────────────────────────────────

export function VoiceEditSheet({
  visible,
  workout,
  plan,
  planWorkouts,
  onApply,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcription, setTranscription] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [modifications, setModifications] = useState<PlanModification[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const result = await AudioModule.requestRecordingPermissionsAsync();
        setHasPermission(result.granted);
      } catch {
        setHasPermission(false);
      }
    })();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setTranscription('');
      setAiMessage('');
      setModifications([]);
    }
  }, [visible]);

  const startRecording = useCallback(async () => {
    if (hasPermission === false) {
      Alert.alert(
        'Microphone Access',
        'SplitCue needs microphone access for voice input. Enable it in Settings.',
      );
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  }, [hasPermission, recorder]);

  const stopAndProcess = useCallback(async () => {
    if (phase !== 'recording') return;

    try {
      await recorder.stop();
      setPhase('transcribing');

      const uri = recorder.uri;
      if (!uri) {
        setPhase('idle');
        return;
      }

      const result = await transcribeAudio(uri, 'audio/m4a');
      const text = result.text.trim();

      if (!text) {
        Alert.alert('No Speech Detected', 'Please try again and speak clearly.');
        setPhase('idle');
        return;
      }

      setTranscription(text);
      setPhase('generating');

      const today = todayStr();
      const outline = plan.outline ?? [];
      const totalWeeks = outline.length ||
        Math.max(...planWorkouts.map((w) => w.week_number), 1);

      // Build a focused context prompt telling the AI which specific workout to edit
      const workoutContext = [
        `Today is ${today}.`,
        `The user wants to edit a specific workout:`,
        `- Date: ${workout.date}`,
        `- Label: ${workout.day_label || 'Training'}`,
        workout.description ? `- Description: ${workout.description}` : null,
        ``,
        `User's instruction: ${text}`,
        ``,
        `Important: If the user asks to move the workout, change the date field in the modification. ` +
        `You may produce modifications for the original date (to skip/update it) and a new date (to add the workout there).`,
      ].filter(Boolean).join('\n');

      // Include a window of surrounding workouts for context
      const workoutWindow = planWorkouts
        .filter((w) => {
          const dayDiff = Math.abs(
            (new Date(w.date).getTime() - new Date(workout.date).getTime()) /
            (24 * 60 * 60 * 1000)
          );
          return dayDiff <= 14;
        })
        .map((w) => ({
          date: w.date,
          day_label: w.day_label || 'Training',
          status: w.status,
          week_number: w.week_number,
        }));

      const adjustResult = await adjustPlan({
        prompt: workoutContext,
        planSummary: {
          title: plan.title,
          raceType: plan.race_type,
          raceDate: plan.race_date,
          startDate: plan.start_date,
          daysPerWeek: plan.days_per_week,
          totalWeeks,
          workouts: workoutWindow,
        },
      });

      setAiMessage(adjustResult.message);
      setModifications(adjustResult.modifications ?? []);
      setPhase('review');
    } catch (err: any) {
      console.error('Voice edit failed:', err);
      Alert.alert(
        'Edit Failed',
        err.message || 'Something went wrong. Please try again.',
      );
      setPhase('idle');
    }
  }, [phase, recorder, plan, planWorkouts, workout]);

  const handleMicPress = useCallback(() => {
    hapticTap();
    if (phase === 'recording') {
      stopAndProcess();
    } else if (phase === 'idle' || phase === 'review') {
      setModifications([]);
      setAiMessage('');
      setTranscription('');
      startRecording();
    }
  }, [phase, startRecording, stopAndProcess]);

  const handleApply = useCallback(async () => {
    if (modifications.length === 0) return;
    hapticTap();
    setPhase('applying');
    try {
      await onApply(modifications);
    } catch (err: any) {
      Alert.alert('Apply Failed', err.message || 'Could not apply changes.');
      setPhase('review');
    }
  }, [modifications, onApply]);

  const handleClose = useCallback(() => {
    if (phase === 'recording') {
      recorder.stop().catch(() => {});
    }
    onClose();
  }, [phase, recorder, onClose]);

  const metering = phase === 'recording' ? recorderState.metering : undefined;
  const workoutLabel = workout.day_label || 'Training';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="sparkles" size={16} color={Colors.accent} />
                <Text style={styles.headerTitle}>Edit with AI</Text>
              </View>
              <Text style={styles.headerWorkout} numberOfLines={1}>
                {workoutLabel} · {formatDate(workout.date)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          {/* ── Idle / Recording ── */}
          {(phase === 'idle' || phase === 'recording') && (
            <View style={styles.voiceSection}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  phase === 'recording' && styles.micButtonActive,
                ]}
                onPress={handleMicPress}
                activeOpacity={0.8}
              >
                {phase === 'recording' ? (
                  <View style={styles.recordingContent}>
                    <SoundBars metering={metering} isActive />
                    <View style={styles.stopIcon}>
                      <Ionicons name="stop" size={14} color={Colors.danger} />
                    </View>
                  </View>
                ) : (
                  <Ionicons name="mic" size={32} color={Colors.accent} />
                )}
              </TouchableOpacity>

              <Text style={styles.voiceLabel}>
                {phase === 'recording'
                  ? 'Listening… tap to stop'
                  : 'Describe how to change this workout'}
              </Text>
              <Text style={styles.voiceHint}>
                {phase === 'recording'
                  ? '"Move this to Thursday" or "Make it 6 miles easy"'
                  : 'e.g. "Shorten this to 30 minutes" or "Move to Saturday"'}
              </Text>
            </View>
          )}

          {/* ── Transcribing ── */}
          {phase === 'transcribing' && (
            <View style={styles.processingSection}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={styles.processingLabel}>Transcribing…</Text>
            </View>
          )}

          {/* ── Generating ── */}
          {phase === 'generating' && (
            <View style={styles.processingSection}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <View style={styles.transcriptionBubble}>
                <Text style={styles.transcriptionText}>"{transcription}"</Text>
              </View>
              <Text style={styles.processingLabel}>Thinking about changes…</Text>
            </View>
          )}

          {/* ── Review proposed changes ── */}
          {phase === 'review' && (
            <View style={styles.reviewSection}>
              {/* What the user said */}
              <View style={styles.transcriptionBubble}>
                <Ionicons name="mic" size={14} color={Colors.accent} />
                <Text style={styles.transcriptionText}>"{transcription}"</Text>
              </View>

              {/* AI message */}
              {aiMessage ? (
                <View style={styles.aiMessageBubble}>
                  <Text style={styles.aiMessageText}>{aiMessage}</Text>
                </View>
              ) : null}

              {/* Modifications list */}
              {modifications.length > 0 ? (
                <View style={styles.modsContainer}>
                  <View style={styles.modsHeader}>
                    <Ionicons name="git-compare-outline" size={18} color={Colors.accent} />
                    <Text style={styles.modsHeaderText}>Proposed Changes</Text>
                    <View style={styles.modsBadge}>
                      <Text style={styles.modsBadgeText}>{modifications.length}</Text>
                    </View>
                  </View>

                  {modifications.map((mod, i) => (
                    <View key={`${mod.date}-${i}`} style={styles.modCard}>
                      <View style={styles.modDateRow}>
                        {mod.date !== workout.date ? (
                          <View style={styles.dateChangeRow}>
                            <Text style={styles.modDateOld}>{formatDate(workout.date)}</Text>
                            <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
                            <Text style={styles.modDateNew}>{formatDate(mod.date)}</Text>
                          </View>
                        ) : (
                          <Text style={styles.modDate}>{formatDate(mod.date)}</Text>
                        )}
                      </View>

                      {mod.action === 'skip' ? (
                        <View style={styles.skipRow}>
                          <Ionicons name="close-circle" size={14} color={Colors.danger} />
                          <Text style={styles.skipText}>Skip this workout</Text>
                        </View>
                      ) : (
                        <View>
                          {/* Label change */}
                          {mod.day_label && mod.day_label !== workout.day_label && (
                            <View style={styles.diffRow}>
                              <Text style={styles.diffOld}>{workout.day_label}</Text>
                              <Ionicons name="arrow-forward" size={10} color={Colors.textMuted} />
                              <Text style={styles.diffNew}>{mod.day_label}</Text>
                            </View>
                          )}
                          {mod.day_label && mod.day_label === workout.day_label && (
                            <Text style={styles.modLabel}>{mod.day_label}</Text>
                          )}
                          {!mod.day_label && (
                            <Text style={styles.modLabel}>{workout.day_label}</Text>
                          )}
                          {mod.description && (
                            <Text style={styles.modDesc} numberOfLines={3}>
                              {mod.description}
                            </Text>
                          )}

                          {/* Before / After workout detail comparison */}
                          {mod.workout && (
                            <View style={styles.comparisonContainer}>
                              {/* Current workout (before) */}
                              {workout.workout_data && (
                                <WorkoutDetailCard
                                  title="Current"
                                  workoutData={workout.workout_data as any}
                                  variant="before"
                                />
                              )}
                              {/* Proposed workout (after) */}
                              <WorkoutDetailCard
                                title="Proposed"
                                workoutData={mod.workout}
                                variant="after"
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noChanges}>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
                  <Text style={styles.noChangesText}>
                    No changes suggested. Try describing what you'd like differently.
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              {modifications.length > 0 && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.discardBtn}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.discardBtnText}>Discard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={handleApply}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={Colors.black} />
                    <Text style={styles.applyBtnText}>Apply Changes</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Retry */}
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={handleMicPress}
                activeOpacity={0.7}
              >
                <Ionicons name="mic" size={16} color={Colors.textSecondary} />
                <Text style={styles.retryBtnText}>Try a different instruction</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Applying ── */}
          {phase === 'applying' && (
            <View style={styles.processingSection}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.processingLabel}>Applying changes…</Text>
            </View>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    minHeight: '40%',
    maxHeight: '80%',
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerWorkout: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Scroll
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  // Voice section
  voiceSection: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent + '40',
    marginBottom: Spacing.md,
  },
  micButtonActive: {
    borderColor: Colors.danger + '60',
    backgroundColor: Colors.danger + '10',
  },
  recordingContent: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.danger + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  voiceHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
  },

  // Processing
  processingSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  processingLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Transcription bubble
  transcriptionBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  transcriptionText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // AI message
  aiMessageBubble: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary + '60',
  },
  aiMessageText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  // Review section
  reviewSection: {
    paddingTop: Spacing.md,
  },

  // Modifications
  modsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  modsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modsHeaderText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  modsBadge: {
    backgroundColor: Colors.accent + '30',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  modsBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
  },
  modCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modDateRow: {
    marginBottom: Spacing.xs,
  },
  modDate: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dateChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  modDateOld: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  modDateNew: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  diffOld: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  diffNew: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  modLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  modDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  comparisonContainer: {
    marginTop: Spacing.sm,
  },

  // No changes
  noChanges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  noChangesText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  discardBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  discardBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  applyBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },

  // Retry
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  retryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
