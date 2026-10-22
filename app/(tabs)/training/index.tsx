/**
 * Training tab — main view redesigned around "What should I run today?"
 *
 * Two states:
 *   A) No plan  → CTA to create plan + manual calendar + "Or keep planning manually"
 *   B) Active plan → Plan header, today's workout card, calendar, day detail, upcoming list
 *
 * Calendar/list/stats toggle preserved for flexibility.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { TrainingCalendar, CalendarViewMode } from '../../../src/components/TrainingCalendar';
import { DayDetail } from '../../../src/components/DayDetail';
import { PlanWeekSummary } from '../../../src/components/PlanWeekSummary';
import { TodayWorkoutCard } from '../../../src/components/TodayWorkoutCard';
import { WorkoutDefinition, generateId, formatTime } from '../../../src/workout/workoutTypes';
import { saveWorkout } from '../../../src/workout/workoutStorage';
import { computeStats } from '../../../src/stats/personalRecords';
import type { StatsSnapshot } from '../../../src/stats/personalRecords';
import { RecordsGrid, AwardsList, LifetimeStats } from '../../../src/components/PersonalBests';
import { ProgressChart } from '../../../src/components/ProgressChart';
import { WorkoutPickerModal } from '../../../src/components/WorkoutPickerModal';
import { addWorkoutToCalendar, generateWorkoutDetails } from '../../../src/ai/planService';
import { ContextualProPrompt } from '../../../src/components/ContextualProPrompt';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

type ViewMode = 'calendar' | 'list' | 'stats';

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
  const { plans, plan, planWorkouts, history, dayEntries, loading, refresh, ensurePlan, skipWorkout, removeWorkout } = useTrainingPlan();

  const racePlans = useMemo(
    () => plans.filter((p) => p.race_type !== 'custom'),
    [plans],
  );

  const raceDates = useMemo(
    () => racePlans.filter((p) => p.race_date).map((p) => p.race_date),
    [racePlans],
  );

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [pickerDate, setPickerDate] = useState<string | null>(null);

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

  const currentWeekWorkouts = useMemo(() => {
    if (!primaryPlan) return [];
    return planWorkouts.filter((w) => w.plan_id === primaryPlan.id && w.week_number === currentWeekNumber);
  }, [planWorkouts, currentWeekNumber, primaryPlan]);

  // Today's planned workout
  const todayEntry = dayEntries[todayKey()];
  const todayPlanWorkout = todayEntry?.planWorkout;

  // Upcoming workouts (next 3 future planned workouts after today)
  const upcomingWorkouts = useMemo(() => {
    const today = todayKey();
    return planWorkouts
      .filter((w) => w.date > today && w.status === 'planned' && w.day_label !== 'Rest Day')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, [planWorkouts]);

  // Stats
  const stats = useMemo<StatsSnapshot | null>(() => {
    if (history.length === 0) return null;
    return computeStats(history);
  }, [history]);

  const chartWidth = 320;

  const formatPaceForChart = useCallback((v: number) => {
    const mins = Math.floor(v);
    const secs = Math.round((v - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatDistForChart = useCallback((v: number) => `${v.toFixed(1)} mi`, []);
  const formatDurForChart = useCallback((v: number) => `${Math.round(v)} min`, []);

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

  const handleEditWorkout = useCallback((workoutData: WorkoutDefinition) => {
    router.push(`/workout/${workoutData.id}`);
  }, [router]);

  const handleViewRun = useCallback((historyEntryId: string) => {
    router.push(`/run/${historyEntryId}`);
  }, [router]);

  const handleRunAgain = useCallback((workoutId: string) => {
    router.push(`/workout/run/${workoutId}`);
  }, [router]);

  const handleGenerateDetail = useCallback(async (workoutId: string) => {
    const pw = planWorkouts.find((w) => w.id === workoutId);
    if (!pw) return;
    const ownerPlan = plans.find((p) => p.id === pw.plan_id);
    if (!ownerPlan) return;
    await generateWorkoutDetails(ownerPlan, [pw]);
    await refresh();
  }, [plans, planWorkouts, refresh]);

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
      {/* View mode toggle */}
      <View style={styles.tabRow}>
        {(['calendar', 'list', 'stats'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.tab, viewMode === mode && styles.tabActive]}
            onPress={() => setViewMode(mode)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                mode === 'calendar' ? 'calendar-outline' :
                mode === 'list' ? 'list-outline' :
                'stats-chart-outline'
              }
              size={14}
              color={viewMode === mode ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, viewMode === mode && styles.tabLabelActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
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
              <TouchableOpacity
                onPress={() => handleAddWorkout(todayKey())}
                activeOpacity={0.7}
              >
                <Text style={styles.manualLink}>Or keep planning your workouts manually</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── State B: Active plan ─── */}
          {hasPlan && primaryPlan && (
            <>
              {/* Plan header */}
              <View style={styles.planHeader}>
                <View style={styles.planHeaderTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planDate}>
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={styles.planName}>
                      {primaryPlan.title || formatRaceLabel(primaryPlan.race_type)}
                    </Text>
                  </View>
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>Week {currentWeekNumber} of {totalWeeks}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (currentWeekNumber / totalWeeks) * 100)}%` }]} />
                </View>

                <View style={styles.planMeta}>
                  <Text style={styles.planMetaText}>
                    Race day: {new Date(primaryPlan.race_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.planMetaText}>
                    {daysUntil(primaryPlan.race_date)} days left
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewPlanLink}
                  onPress={() => router.push('/(tabs)/training/overview' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewPlanLinkText}>View Full Plan</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Today's workout card */}
              {todayPlanWorkout && (
                <TodayWorkoutCard
                  planWorkout={todayPlanWorkout}
                  onStart={handleStartWorkout}
                  onAdjust={() => router.push('/(tabs)/training/chat' as any)}
                  onGenerateDetail={() => handleGenerateDetail(todayPlanWorkout.id)}
                />
              )}
            </>
          )}

          {/* Add another plan banner (for authenticated users with plans) */}
          {hasPlan && user && (
            <TouchableOpacity
              style={styles.addPlanBanner}
              onPress={() => router.push('/(tabs)/training/setup' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
              <Text style={styles.addPlanBannerText}>Add Another Training Plan</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Calendar */}
          <TrainingCalendar
            dayEntries={dayEntries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            viewMode={calendarViewMode}
            onChangeViewMode={setCalendarViewMode}
            raceDates={raceDates}
          />

          {/* Day detail */}
          <DayDetail
            entry={dayEntries[selectedDate]}
            selectedDate={selectedDate}
            onStartWorkout={handleStartWorkout}
            onSkipWorkout={handleSkipWorkout}
            onRemoveWorkout={handleRemoveWorkout}
            onEditWorkout={handleEditWorkout}
            onViewRun={handleViewRun}
            onRunAgain={handleRunAgain}
            onAddWorkout={user ? handleAddWorkout : undefined}
            onGenerateDetail={plans.length > 0 ? handleGenerateDetail : undefined}
          />

          {/* Upcoming workouts */}
          {upcomingWorkouts.length > 0 && (
            <View style={styles.upcomingSection}>
              <View style={styles.upcomingHeader}>
                <Text style={styles.upcomingSectionTitle}>Upcoming workouts</Text>
              </View>
              {upcomingWorkouts.map((pw) => (
                <TouchableOpacity
                  key={pw.id}
                  style={styles.upcomingCard}
                  onPress={() => setSelectedDate(pw.date)}
                  activeOpacity={0.7}
                >
                  <View style={styles.upcomingDate}>
                    <Text style={styles.upcomingDateDay}>
                      {new Date(pw.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                    </Text>
                    <Text style={styles.upcomingDateNum}>
                      {new Date(pw.date + 'T12:00:00').getDate()}
                    </Text>
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingName} numberOfLines={1}>{pw.day_label || 'Training'}</Text>
                    {pw.description && (
                      <Text style={styles.upcomingDesc} numberOfLines={1}>{pw.description}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* AI Coach section */}
          {hasPlan && (
            <TouchableOpacity
              style={styles.coachSection}
              onPress={() => router.push('/(tabs)/training/chat' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.coachSectionIcon}>
                <Ionicons name="sparkles" size={18} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachSectionTitle}>Your AI Coach</Text>
                <Text style={styles.coachSectionDesc}>
                  Need to change your schedule or understand your training?
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Contextual Pro prompt — weekly progress nudge */}
          {hasPlan && (
            <ContextualProPrompt
              momentId="weekly_progress_nudge"
              onUpgrade={() => router.push('/paywall' as any)}
            />
          )}
        </ScrollView>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {history.length > 0 && (
                <Text style={styles.sectionHeader}>
                  {history.length} workout{history.length !== 1 ? 's' : ''} completed
                </Text>
              )}
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => handleViewRun(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.listCardAccent} />
              <View style={styles.listCardContent}>
                <View style={styles.listCardRow}>
                  <Text style={styles.listCardName} numberOfLines={1}>{item.workoutName}</Text>
                  <Text style={styles.listCardDate}>
                    {new Date(item.completedAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.listCardStats}>
                  <Text style={styles.listCardDuration}>
                    {formatTime(Math.floor(item.totalDurationMs / 1000))}
                  </Text>
                  {item.totalDistanceMeters != null && item.totalDistanceMeters > 0 && (
                    <Text style={styles.listCardDistance}>
                      {(item.totalDistanceMeters / 1609.344).toFixed(2)} mi
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptyText}>
                Complete a workout and it'll show up here.
              </Text>
            </View>
          }
        />
      )}

      {/* Stats view */}
      {viewMode === 'stats' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {stats ? (
            <View>
              <LifetimeStats
                totalWorkouts={stats.totalWorkouts}
                totalDistanceMeters={stats.totalDistanceMeters}
                totalDurationMs={stats.totalDurationMs}
              />
              <RecordsGrid records={stats.records} />
              <AwardsList awards={stats.awards} />
              <View style={styles.chartsSection}>
                <Text style={styles.chartsSectionTitle}>Progress Over Time</Text>
                <ProgressChart
                  data={stats.paceTrend}
                  title="Pace (min/mi)"
                  formatValue={formatPaceForChart}
                  lowerIsBetter
                  width={chartWidth}
                  color={Colors.primary}
                />
                <ProgressChart
                  data={stats.distanceTrend}
                  title="Distance (miles)"
                  formatValue={formatDistForChart}
                  width={chartWidth}
                  color={Colors.accent}
                />
                <ProgressChart
                  data={stats.durationTrend}
                  title="Duration (minutes)"
                  formatValue={formatDurForChart}
                  width={chartWidth}
                  color={Colors.warning}
                />
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="stats-chart-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No stats yet</Text>
              <Text style={styles.emptyText}>
                Complete some workouts to see your stats and progress.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Workout picker modal */}
      <WorkoutPickerModal
        visible={pickerDate !== null}
        date={pickerDate ?? selectedDate}
        onSelect={handleWorkoutPicked}
        onCreateNew={handleCreateNewForPlan}
        onClose={() => setPickerDate(null)}
      />
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
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md - 2,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.surfaceLight,
  },
  tabLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },

  // ─── No-plan hero ───
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
  manualLink: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },

  // ─── Plan header ───
  planHeader: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  planHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  planDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  planName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
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
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden' as const,
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  planMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  planMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  viewPlanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewPlanLinkText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },

  // ─── Add plan banner ───
  addPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  addPlanBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // ─── Upcoming workouts ───
  upcomingSection: {
    marginTop: Spacing.md,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  upcomingSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  upcomingDate: {
    alignItems: 'center',
    width: 40,
  },
  upcomingDateDay: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  upcomingDateNum: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  upcomingDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ─── AI Coach section ───
  coachSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  coachSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  coachSectionDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
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

  // ─── List view ───
  sectionHeader: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  listCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  listCardAccent: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  listCardContent: {
    flex: 1,
    padding: Spacing.md,
  },
  listCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCardName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  listCardDate: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  listCardStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  listCardDuration: {
    fontSize: FontSize.lg,
    color: Colors.accent,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  listCardDistance: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // ─── Stats ───
  chartsSection: {
    marginTop: Spacing.md,
  },
  chartsSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
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
