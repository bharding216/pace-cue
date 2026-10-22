/**
 * Workout Detail screen for planned workouts.
 *
 * Shows workout structure breakdown, "Why this workout?" explanation,
 * Start/Reschedule/Adjust buttons, and contextual coach chips.
 *
 * Accessed via query params: ?workoutId=<plan_workout_id>
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { WorkoutStructure } from '../../../src/components/WorkoutStructure';
import { VoiceInput } from '../../../src/components/VoiceInput';
import { ModificationReview, type ModificationItem } from '../../../src/components/ModificationReview';
import { WorkoutDefinition, generateId, totalWorkoutSeconds } from '../../../src/workout/workoutTypes';
import { saveWorkout } from '../../../src/workout/workoutStorage';
import {
  generateWorkoutDetails,
  adjustPlan,
  applyPlanModifications,
  type PlanModification,
} from '../../../src/ai/planService';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getIntensityTag(label: string | null): { text: string; color: string } | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes('easy') || lower.includes('recovery')) return { text: 'Easy', color: Colors.easy };
  if (lower.includes('tempo') || lower.includes('threshold')) return { text: 'Moderate', color: Colors.warning };
  if (lower.includes('interval') || lower.includes('speed') || lower.includes('hard')) return { text: 'Speed', color: Colors.hard };
  if (lower.includes('long')) return { text: 'Long Run', color: Colors.accent };
  return null;
}

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { plans, planWorkouts, refresh, skipWorkout, removeWorkout } = useTrainingPlan();
  const [generatingDetail, setGeneratingDetail] = useState(false);
  const [adjustText, setAdjustText] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [modificationItems, setModificationItems] = useState<ModificationItem[]>([]);
  const [coachResponse, setCoachResponse] = useState<string | null>(null);

  const planWorkout = useMemo(
    () => planWorkouts.find((pw) => pw.id === workoutId) ?? null,
    [planWorkouts, workoutId],
  );

  const ownerPlan = useMemo(
    () => (planWorkout ? plans.find((p) => p.id === planWorkout.plan_id) : null) ?? null,
    [plans, planWorkout],
  );

  const workoutData = planWorkout?.workout_data as WorkoutDefinition | null;

  const weekLabel = planWorkout
    ? `Week ${planWorkout.week_number}`
    : '';

  const dayLabel = planWorkout
    ? DAY_NAMES[new Date(planWorkout.date + 'T12:00:00').getDay()].toUpperCase()
    : '';

  const intensity = getIntensityTag(planWorkout?.day_label ?? null);

  const duration = useMemo(() => {
    if (!workoutData) return null;
    const secs = totalWorkoutSeconds(workoutData);
    return secs > 0 ? `~${Math.round(secs / 60)} min` : null;
  }, [workoutData]);

  const handleStart = useCallback(async () => {
    if (!workoutData) return;
    const workout: WorkoutDefinition = {
      ...workoutData,
      id: workoutData.id || generateId(),
      updatedAt: Date.now(),
    };
    await saveWorkout(workout);
    router.push(`/workout/run/${workout.id}`);
  }, [workoutData, router]);

  const handleGenerateDetail = useCallback(async () => {
    if (!planWorkout || !ownerPlan) return;
    setGeneratingDetail(true);
    try {
      await generateWorkoutDetails(ownerPlan, [planWorkout]);
      await refresh();
    } catch (err) {
      console.warn('Failed to generate workout detail:', err);
    } finally {
      setGeneratingDetail(false);
    }
  }, [planWorkout, ownerPlan, refresh]);

  const handleSkip = useCallback(async () => {
    if (!planWorkout) return;
    await skipWorkout(planWorkout.id);
    router.back();
  }, [planWorkout, skipWorkout, router]);

  const handleAdjustRequest = useCallback(async (message: string) => {
    if (!ownerPlan || !message.trim()) return;
    setAdjusting(true);
    setCoachResponse(null);
    setModificationItems([]);

    try {
      const context = planWorkout
        ? `Context: The user is looking at "${planWorkout.day_label}" on ${planWorkout.date} (Week ${planWorkout.week_number}).`
        : '';

      const result = await adjustPlan(ownerPlan, `${context}\n\nUser request: ${message}`);

      setCoachResponse(result.message);

      if (result.modifications.length > 0) {
        const items: ModificationItem[] = result.modifications.map((mod) => {
          const existing = planWorkouts.find((pw) => pw.date === mod.date);
          return {
            modification: mod,
            before: existing
              ? { day_label: existing.day_label ?? undefined, description: existing.description ?? undefined }
              : null,
          };
        });
        setModificationItems(items);
      }
    } catch (err) {
      console.warn('Adjustment failed:', err);
      setCoachResponse("Sorry, I couldn't process that right now. Try again or use the chat for more detailed adjustments.");
    } finally {
      setAdjusting(false);
    }
  }, [ownerPlan, planWorkout, planWorkouts]);

  const handleChipPress = useCallback((prompt: string) => {
    setAdjustText(prompt);
    handleAdjustRequest(prompt);
  }, [handleAdjustRequest]);

  const handleApplyModifications = useCallback(async (mods: PlanModification[]) => {
    if (!ownerPlan) return;
    await applyPlanModifications(ownerPlan.id, mods);
    await refresh();
    setModificationItems([]);
  }, [ownerPlan, refresh]);

  const handleKeepOriginal = useCallback(() => {
    setModificationItems([]);
    setCoachResponse(null);
  }, []);

  const handleVoiceTranscription = useCallback((text: string) => {
    setAdjustText(text);
    handleAdjustRequest(text);
  }, [handleAdjustRequest]);

  const handleSendText = useCallback(() => {
    if (adjustText.trim()) {
      handleAdjustRequest(adjustText.trim());
      setAdjustText('');
    }
  }, [adjustText, handleAdjustRequest]);

  const coachChips = [
    { icon: 'bed-outline' as const, label: "I'm feeling tired", prompt: "I'm feeling tired. Can you make this workout easier?" },
    { icon: 'calendar-outline' as const, label: 'Move this workout', prompt: 'Can you move this workout to a different day?' },
    { icon: 'time-outline' as const, label: 'Make it shorter', prompt: 'I have limited time. Can you shorten this workout?' },
    { icon: 'help-circle-outline' as const, label: 'Why this workout?', prompt: 'Why is this workout in my plan? What does it accomplish?' },
  ];

  if (!planWorkout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Workout not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.dayWeek}>{dayLabel} {'\u00B7'} {weekLabel}</Text>
        {intensity && (
          <View style={[styles.intensityBadge, { backgroundColor: intensity.color + '20', borderColor: intensity.color + '40' }]}>
            <Text style={[styles.intensityText, { color: intensity.color }]}>{intensity.text}</Text>
          </View>
        )}
      </View>

      {/* Workout name */}
      <Text style={styles.workoutName}>{planWorkout.day_label || 'Training'}</Text>

      {/* Meta */}
      <View style={styles.metaRow}>
        {duration && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{duration}</Text>
          </View>
        )}
        {intensity && (
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={16} color={intensity.color} />
            <Text style={[styles.metaText, { color: intensity.color }]}>{intensity.text}</Text>
          </View>
        )}
      </View>

      {/* Workout structure */}
      {workoutData ? (
        <WorkoutStructure workout={workoutData} />
      ) : (
        <View style={styles.noDetailCard}>
          <Text style={styles.noDetailText}>
            Workout details haven't been generated yet.
          </Text>
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerateDetail}
            disabled={generatingDetail}
            activeOpacity={0.8}
          >
            {generatingDetail ? (
              <ActivityIndicator size="small" color={Colors.black} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={16} color={Colors.black} />
                <Text style={styles.generateBtnText}>Generate Details</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Why this workout */}
      {planWorkout.description && (
        <View style={styles.whySection}>
          <View style={styles.whyHeader}>
            <Ionicons name="sparkles-outline" size={16} color={Colors.accent} />
            <Text style={styles.whyTitle}>Why this workout?</Text>
          </View>
          <Text style={styles.whyText}>{planWorkout.description}</Text>
        </View>
      )}

      {/* Action buttons */}
      {workoutData && (
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={18} color={Colors.black} />
          <Text style={styles.startBtnText}>Start Workout</Text>
        </TouchableOpacity>
      )}

      <View style={styles.secondaryRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.secondaryBtnText}>Reschedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/(tabs)/training/chat' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.secondaryBtnText}>Adjust</Text>
        </TouchableOpacity>
      </View>

      {/* AI Coach Adjustment */}
      <View style={styles.coachSection}>
        <View style={styles.coachHeader}>
          <Ionicons name="sparkles" size={16} color={Colors.accent} />
          <Text style={styles.coachTitle}>Ask your coach</Text>
        </View>
        <Text style={styles.coachSubtitle}>Need to change today's workout?</Text>

        {/* Voice + text input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type an adjustment…"
            placeholderTextColor={Colors.textMuted}
            value={adjustText}
            onChangeText={setAdjustText}
            onSubmitEditing={handleSendText}
            returnKeyType="send"
            multiline={false}
          />
          <VoiceInput
            onTranscription={handleVoiceTranscription}
            compact
          />
          <TouchableOpacity
            style={[styles.sendBtn, !adjustText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendText}
            disabled={!adjustText.trim() || adjusting}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={16} color={adjustText.trim() ? Colors.accent : Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quick chips */}
        <View style={styles.chipGrid}>
          {coachChips.map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={styles.chip}
              onPress={() => handleChipPress(chip.prompt)}
              disabled={adjusting}
              activeOpacity={0.7}
            >
              <Ionicons name={chip.icon} size={14} color={Colors.accent} />
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pro prompt for voice feature */}
        <ContextualProPrompt
          momentId="voice_feature_gate"
          onUpgrade={() => router.push('/paywall' as any)}
        />

        {/* Loading state */}
        {adjusting && (
          <View style={styles.adjustingRow}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.adjustingText}>Your coach is thinking…</Text>
          </View>
        )}

        {/* Coach response */}
        {coachResponse && !adjusting && (
          <View style={styles.responseBubble}>
            <Text style={styles.responseText}>{coachResponse}</Text>
          </View>
        )}

        {/* Modification review */}
        {modificationItems.length > 0 && !adjusting && (
          <ModificationReview
            items={modificationItems}
            coachMessage={coachResponse ?? undefined}
            onApply={handleApplyModifications}
            onKeepOriginal={handleKeepOriginal}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dayWeek: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  intensityBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  intensityText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },

  // Workout name
  workoutName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // No detail
  noDetailCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  noDetailText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  generateBtnText: {
    color: Colors.black,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  // Why this workout
  whySection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '20',
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  whyTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
  },
  whyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Action buttons
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  startBtnText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.xs,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // Coach section
  coachSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '20',
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  coachTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  coachSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    width: '48%' as any,
  },
  chipLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  adjustingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    justifyContent: 'center',
  },
  adjustingText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  responseBubble: {
    backgroundColor: Colors.accent + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  responseText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    lineHeight: 20,
  },
});
