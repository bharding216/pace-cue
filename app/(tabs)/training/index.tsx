/**
 * Training tab — main view redesigned around "What should I run today?"
 *
 * Two states:
 *   A) No plan  → CTA to create plan + manual calendar + "Or keep planning manually"
 *   B) Active plan → Plan header, today's workout card, calendar, day detail, upcoming list
 *
 * Stats accessible via a dedicated button on the page.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { TrainingCalendar, CalendarViewMode } from '../../../src/components/TrainingCalendar';
import { MoveWorkoutModal } from '../../../src/components/MoveWorkoutModal';
import { DayDetail } from '../../../src/components/DayDetail';
import { derivePhases } from '../../../src/components/TrainingPhases';
import { WorkoutDefinition, generateId } from '../../../src/workout/workoutTypes';
import { saveWorkout } from '../../../src/workout/workoutStorage';
import { WorkoutPickerModal } from '../../../src/components/WorkoutPickerModal';
import { addWorkoutToCalendar, generateWorkoutDetails } from '../../../src/ai/planService';
import { ContextualProPrompt } from '../../../src/components/ContextualProPrompt';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function formatRaceLabel(raceType: string): string {
  switch (raceType) {
    case '5k': return '5K';
    case '10k': return '10K';
    case 'half_marathon': return 'Half Marathon';
    case 'marathon': return 'Marathon';
    default: return 'Training';
  }
}

export default function TrainingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plans, archivedPlans, plan, planWorkouts, dayEntries, loading, refresh, ensurePlan, skipWorkout, unskipWorkout, removeWorkout, moveWorkout } = useTrainingPlan();

  const racePlans = useMemo(
    () => plans.filter((p) => p.race_type !== 'custom'),
    [plans],
  );

  const raceDates = useMemo(
    () => racePlans.filter((p) => p.race_date).map((p) => p.race_date),
    [racePlans],
  );

  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; date: string; label: string } | null>(null);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [weekExpanded, setWeekExpanded] = useState(false);

  const HERO_COLLAPSED_KEY = 'training_hero_collapsed';

  useEffect(() => {
    AsyncStorage.getItem(HERO_COLLAPSED_KEY).then((val) => {
      if (val === 'true') setHeroCollapsed(true);
    });
  }, []);

  const toggleHeroCollapsed = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHeroCollapsed((prev) => {
      const next = !prev;
      AsyncStorage.setItem(HERO_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Primary plan info
  const primaryPlan = racePlans[0] ?? null;
  const currentWeekNumber = useMemo(() => {
    if (!primaryPlan) return 0;
    const today = new Date();
    const start = new Date(primaryPlan.start_date);
    const diffMs = today.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }, [primaryPlan]);

  const totalWeeks = useMemo(() => {
    if (!primaryPlan) return 0;
    const start = new Date(primaryPlan.start_date);
    const end = new Date(primaryPlan.race_date);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  }, [primaryPlan]);

  const currentPhase = useMemo(() => {
    if (!primaryPlan) return null;
    const phases = derivePhases(primaryPlan.outline, currentWeekNumber);
    return phases.find((p) => p.status === 'current') ?? null;
  }, [primaryPlan, currentWeekNumber]);

  // Selected day entry
  const selectedDayEntry = dayEntries[selectedDate];

  // Workouts for the next 7 days (always from today)
  const next7DaysWorkouts = useMemo(() => {
    const today = todayKey();
    const end = new Date();
    end.setDate(end.getDate() + 6);
    const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return planWorkouts
      .filter((w) => w.date >= today && w.date <= endKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [planWorkouts]);

  const handleStartWorkout = useCallback(async (workoutData: WorkoutDefinition) => {
    const workout: WorkoutDefinition = {
      ...workoutData,
      id: workoutData.id || generateId(),
      updatedAt: Date.now(),
    };
    await saveWorkout(workout);
    router.push(`/workout/run/${workout.id}`);
  }, [router]);

  const handleSkipWorkout = useCallback(async (workoutId: string) => {
    await skipWorkout(workoutId);
  }, [skipWorkout]);

  const handleRemoveWorkout = useCallback(async (workoutId: string) => {
    await removeWorkout(workoutId);
  }, [removeWorkout]);

  const handleMoveWorkout = useCallback(async (newDate: string) => {
    if (!moveTarget) return;
    setMoveTarget(null);
    await moveWorkout(moveTarget.id, newDate);
  }, [moveTarget, moveWorkout]);

  const handleEditWorkout = useCallback(async (workoutData: WorkoutDefinition) => {
    const workout: WorkoutDefinition = {
      ...workoutData,
      id: workoutData.id || generateId(),
      updatedAt: Date.now(),
    };
    await saveWorkout(workout);
    router.push(`/workout/${workout.id}`);
  }, [router]);

  const handleUnskipWorkout = useCallback(async (workoutId: string) => {
    await unskipWorkout(workoutId);
  }, [unskipWorkout]);

  const handleViewRun = useCallback((historyEntryId: string) => {
    router.push(`/run/${historyEntryId}` as any);
  }, [router]);

  const handleRunAgain = useCallback(async (workoutId: string) => {
    router.push(`/workout/run/${workoutId}`);
  }, [router]);

  const handleMoveWorkoutFromDay = useCallback((workoutId: string) => {
    const pw = planWorkouts.find((w) => w.id === workoutId);
    if (pw) {
      setMoveTarget({ id: pw.id, date: pw.date, label: pw.day_label || 'Training' });
    }
  }, [planWorkouts]);

  const handleGenerateDetail = useCallback(async (workoutId: string) => {
    const pw = planWorkouts.find((w) => w.id === workoutId);
    if (!pw) return;
    const ownerPlan = plans.find((p) => p.id === pw.plan_id);
    if (!ownerPlan) return;
    await generateWorkoutDetails(ownerPlan, [pw]);
    await refresh();
  }, [planWorkouts, plans, refresh]);

  const handleAddWorkout = useCallback((date: string) => {
    setPickerDate(date);
  }, []);

  const handleCreateNewForPlan = useCallback(() => {
    const date = pickerDate;
    setPickerDate(null);
    router.push(`/workout/new?addToDate=${date}` as any);
  }, [pickerDate, router]);

  const handleWorkoutPicked = useCallback(async (workout: WorkoutDefinition) => {
    if (!user || !pickerDate) return;
    setPickerDate(null);
    const activePlan = await ensurePlan();
    await addWorkoutToCalendar(activePlan.id, user.id, pickerDate, workout, activePlan.start_date);
    await refresh();
  }, [user, pickerDate, ensurePlan, refresh]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const hasPlan = racePlans.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {/* ─── State A: No active plan ─── */}
          {!hasPlan && !user && (
            <View style={styles.coachCard}>
              <View style={styles.coachIconRow}>
                <View style={styles.coachIconBg}>
                  <Ionicons name="sparkles" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.coachBadge}>AI-Powered</Text>
              </View>
              <Text style={styles.coachTitle}>Meet Your AI Running Coach</Text>
              <Text style={styles.coachDesc}>
                Chat with our AI coach to set your goals, dial in your preferences, and get a personalized training plan built just for you.
              </Text>
              <View style={styles.coachFeatures}>
                {[
                  { icon: 'chatbubbles-outline' as const, text: 'Chat naturally about your goals' },
                  { icon: 'body-outline' as const, text: 'Personalized to your fitness level' },
                  { icon: 'calendar-outline' as const, text: 'Full training plans for any race' },
                  { icon: 'refresh-outline' as const, text: 'Adjust your plan anytime via chat' },
                ].map((f) => (
                  <View key={f.text} style={styles.coachFeatureRow}>
                    <Ionicons name={f.icon} size={16} color={Colors.primary} />
                    <Text style={styles.coachFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.coachCta}
                onPress={() => router.push('/login' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in-outline" size={18} color={Colors.black} />
                <Text style={styles.coachCtaText}>Sign In to Get Started</Text>
              </TouchableOpacity>
            </View>
          )}

          {!hasPlan && user && (
            heroCollapsed ? (
              <TouchableOpacity
                style={styles.heroCollapsedBar}
                onPress={toggleHeroCollapsed}
                activeOpacity={0.7}
              >
                <View style={styles.heroCollapsedLeft}>
                  <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                  <Text style={styles.heroCollapsedText}>Create a Training Plan</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <View style={styles.noPlanHero}>
                <View style={styles.noPlanIconBg}>
                  <Ionicons name="fitness-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.noPlanTitle}>Train toward something great.</Text>
                <Text style={styles.noPlanDesc}>
                  Whether you're running your first 5K or chasing a new PR, PaceCue can build a training plan around your goals and schedule.
                </Text>
                <TouchableOpacity
                  style={styles.createPlanBtn}
                  onPress={() => router.push('/(tabs)/training/setup' as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={18} color={Colors.black} />
                  <Text style={styles.createPlanBtnText}>Create Training Plan</Text>
                </TouchableOpacity>

                {archivedPlans.length > 0 && (
                  <TouchableOpacity
                    style={styles.archivedLink}
                    onPress={() => router.push('/(tabs)/training/overview' as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="archive-outline" size={16} color={Colors.textMuted} />
                    <Text style={styles.archivedLinkText}>
                      {archivedPlans.filter((p) => p.race_type !== 'custom').length} archived plan{archivedPlans.filter((p) => p.race_type !== 'custom').length !== 1 ? 's' : ''} — Restore
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.heroDismissBtn}
                  onPress={toggleHeroCollapsed}
                  activeOpacity={0.7}
                >
                  <Text style={styles.heroDismissText}>Hide</Text>
                  <Ionicons name="chevron-up" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            )
          )}

          {/* ─── State B: Active plan ─── */}
          {hasPlan && primaryPlan && (
            <>
              {/* Plan header — tappable to view full plan */}
              <TouchableOpacity
                style={styles.planHeader}
                onPress={() => router.push('/(tabs)/training/overview' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.planHeaderTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName} numberOfLines={1}>
                      {primaryPlan.title || formatRaceLabel(primaryPlan.race_type)}
                    </Text>
                  </View>
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>Wk {currentWeekNumber}/{totalWeeks}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (currentWeekNumber / totalWeeks) * 100)}%` }]} />
                </View>

                <View style={styles.planMeta}>
                  {currentPhase && (
                    <>
                      <Ionicons name="flag-outline" size={12} color={Colors.primary} />
                      <Text style={styles.phaseLabel}>{currentPhase.name}</Text>
                      <Text style={styles.planMetaDot}>·</Text>
                    </>
                  )}
                  <Text style={styles.planMetaText}>
                    {new Date(primaryPlan.race_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.planMetaDot}>·</Text>
                  <Text style={styles.planMetaText}>
                    {daysUntil(primaryPlan.race_date)}d left
                  </Text>
                </View>
              </TouchableOpacity>

            </>
          )}

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.addWorkoutBtn}
              onPress={() => handleAddWorkout(selectedDate)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={Colors.black} />
              <Text style={styles.addWorkoutBtnText}>Add Workout to Selected Day</Text>
            </TouchableOpacity>
            {hasPlan && user && (
              <TouchableOpacity
                style={styles.addPlanBanner}
                onPress={() => router.push('/(tabs)/training/setup' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
                <Text style={styles.addPlanBannerText}>Add Plan</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.statsBtn}
              onPress={() => router.push('/(tabs)/training/stats' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="stats-chart" size={18} color={Colors.primary} />
              <Text style={styles.statsBtnText}>Stats</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <TrainingCalendar
            dayEntries={dayEntries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            viewMode={calendarViewMode}
            onChangeViewMode={setCalendarViewMode}
            raceDates={raceDates}
          />

          {/* ─── Selected day detail ─── */}
          <View style={styles.dayDetailSection}>
            <DayDetail
              entry={selectedDayEntry}
              selectedDate={selectedDate}
              onStartWorkout={handleStartWorkout}
              onSkipWorkout={handleSkipWorkout}
              onUnskipWorkout={handleUnskipWorkout}
              onRemoveWorkout={handleRemoveWorkout}
              onMoveWorkout={handleMoveWorkoutFromDay}
              onEditWorkout={handleEditWorkout}
              onViewRun={handleViewRun}
              onRunAgain={handleRunAgain}
              onAddWorkout={handleAddWorkout}
              onGenerateDetail={handleGenerateDetail}
            />
          </View>

          {/* ─── This Week toggle ─── */}
          <View style={styles.weekSection}>
            <TouchableOpacity
              style={styles.weekToggle}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setWeekExpanded((prev) => !prev);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.weekToggleLeft}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.weekToggleText}>Workouts This Week</Text>
                {next7DaysWorkouts.length > 0 && (
                  <View style={styles.weekCountBadge}>
                    <Text style={styles.weekCountText}>{next7DaysWorkouts.filter((w) => w.day_label !== 'Rest Day').length}</Text>
                  </View>
                )}
              </View>
              <Ionicons name={weekExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {weekExpanded && next7DaysWorkouts.length > 0 && (
                <View style={styles.weekList}>
                  {next7DaysWorkouts.map((pw) => {
                    const isToday = pw.date === todayKey();
                    const isSelected = pw.date === selectedDate;
                    const isCompleted = pw.status === 'completed';
                    const isSkipped = pw.status === 'skipped';
                    const isRest = pw.day_label === 'Rest Day';
                    const dayDate = new Date(pw.date + 'T12:00:00');
                    return (
                      <TouchableOpacity
                        key={pw.id}
                        style={[
                          styles.weekCard,
                          isSelected && styles.weekCardSelected,
                        ]}
                        onPress={() => setSelectedDate(pw.date)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.weekCardDate}>
                          <Text style={[styles.weekCardDay, isToday && styles.weekCardDayToday]}>
                            {isToday ? 'Today' : dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
                          </Text>
                          {!isToday && (
                            <Text style={styles.weekCardNum}>{dayDate.getDate()}</Text>
                          )}
                        </View>
                        <View style={styles.weekCardInfo}>
                          <Text
                            style={[
                              styles.weekCardLabel,
                              isRest && styles.weekCardLabelRest,
                            ]}
                            numberOfLines={1}
                          >
                            {pw.day_label || 'Training'}
                          </Text>
                          {pw.description && !isRest && (
                            <Text style={styles.weekCardDesc} numberOfLines={1}>{pw.description}</Text>
                          )}
                        </View>
                        {isCompleted ? (
                          <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                        ) : isSkipped ? (
                          <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                        ) : isRest ? (
                          <Ionicons name="bed-outline" size={16} color={Colors.textMuted} />
                        ) : (
                          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
            )}
            {weekExpanded && next7DaysWorkouts.length === 0 && (
              <View style={styles.weekEmptyState}>
                <Text style={styles.weekEmptyText}>No workouts scheduled this week</Text>
              </View>
            )}
          </View>

          {/* Contextual Pro prompt — weekly progress nudge */}
          {hasPlan && (
            <ContextualProPrompt
              momentId="weekly_progress_nudge"
              onUpgrade={() => router.push('/paywall' as any)}
            />
          )}

        </ScrollView>

      {/* Workout picker modal */}
      <WorkoutPickerModal
        visible={pickerDate !== null}
        date={pickerDate ?? selectedDate}
        onSelect={handleWorkoutPicked}
        onCreateNew={handleCreateNewForPlan}
        onClose={() => setPickerDate(null)}
      />

      {/* Move workout modal */}
      {moveTarget && (
        <MoveWorkoutModal
          visible={!!moveTarget}
          currentDate={moveTarget.date}
          workoutLabel={moveTarget.label}
          dayEntries={dayEntries}
          onMove={handleMoveWorkout}
          onClose={() => setMoveTarget(null)}
        />
      )}
    </View>
  );
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addWorkoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  addWorkoutBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  statsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  statsBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },

  // ─── No-plan hero ───
  heroCollapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  heroCollapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroCollapsedText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  heroDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  heroDismissText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  noPlanHero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  noPlanIconBg: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  noPlanTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  noPlanDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  createPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignSelf: 'stretch',
  },
  createPlanBtnText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  archivedLinkText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  // ─── Plan header ───
  planHeader: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  planHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  planName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weekBadge: {
    backgroundColor: Colors.primary + '18',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
  },
  weekBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden' as const,
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  phaseLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planMetaDot: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  planMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },

  // ─── Add plan banner ───
  addPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  addPlanBannerText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // ─── Day detail section ───
  dayDetailSection: {
    marginTop: Spacing.md,
  },

  // ─── This Week section ───
  weekSection: {
    marginTop: Spacing.md,
  },
  weekToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  weekToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weekToggleText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weekCountBadge: {
    backgroundColor: Colors.primary + '18',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  weekCountText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  weekList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  weekCardSelected: {
    borderColor: Colors.primary + '50',
    backgroundColor: Colors.primary + '08',
  },
  weekCardDate: {
    alignItems: 'center',
    width: 36,
  },
  weekCardDay: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  weekCardDayToday: {
    color: Colors.primary,
    fontWeight: '800',
  },
  weekCardNum: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  weekCardInfo: {
    flex: 1,
  },
  weekCardLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  weekCardLabelRest: {
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  weekCardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  weekEmptyState: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  weekEmptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },

  // ─── AI Coach promo card (unauthenticated) ───
  coachCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  coachIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  coachIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBadge: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.accent,
    backgroundColor: Colors.accent + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  coachTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  coachDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  coachFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  coachFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  coachFeatureText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  coachCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.xs,
  },
  coachCtaText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },

  // ─── Empty ───
  emptyContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
