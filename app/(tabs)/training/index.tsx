/**
 * Training tab — main view with calendar/list/stats toggle.
 * Shows both past completed runs and future planned workouts.
 * When no plan exists, shows history + CTA to create a plan.
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
import { WorkoutDefinition, generateId, formatTime } from '../../../src/workout/workoutTypes';
import { saveWorkout } from '../../../src/workout/workoutStorage';
import { computeStats } from '../../../src/stats/personalRecords';
import type { StatsSnapshot } from '../../../src/stats/personalRecords';
import { RecordsGrid, AwardsList, LifetimeStats } from '../../../src/components/PersonalBests';
import { ProgressChart } from '../../../src/components/ProgressChart';
import { WorkoutPickerModal } from '../../../src/components/WorkoutPickerModal';
import { addWorkoutToCalendar, generateWorkoutDetails } from '../../../src/ai/planService';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

type ViewMode = 'calendar' | 'list' | 'stats';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TrainingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plans, plan, planWorkouts, history, dayEntries, loading, refresh, ensurePlan, skipWorkout, removeWorkout } = useTrainingPlan();

  // Collect race dates from all non-custom active plans
  const raceDates = useMemo(
    () => plans
      .filter((p) => p.race_type !== 'custom' && p.race_date)
      .map((p) => p.race_date),
    [plans],
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

  // Current week number for week summary
  const currentWeekNumber = useMemo(() => {
    if (!plan) return 0;
    const today = new Date();
    const start = new Date(plan.start_date);
    const diffMs = today.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }, [plan]);

  const currentWeekWorkouts = useMemo(() => {
    if (!plan) return [];
    return planWorkouts.filter((w) => w.week_number === currentWeekNumber);
  }, [planWorkouts, currentWeekNumber, plan]);

  // Stats
  const stats = useMemo<StatsSnapshot | null>(() => {
    if (history.length === 0) return null;
    return computeStats(history);
  }, [history]);

  const chartWidth = 320; // Approximate

  const formatPaceForChart = useCallback((v: number) => {
    const mins = Math.floor(v);
    const secs = Math.round((v - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatDistForChart = useCallback((v: number) => `${v.toFixed(1)} mi`, []);
  const formatDurForChart = useCallback((v: number) => `${Math.round(v)} min`, []);

  const handleStartWorkout = useCallback(async (workoutData: WorkoutDefinition) => {
    // Ensure the workout has a proper ID and save it locally
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
          {/* Plan week summary — only for AI-generated plans, not the custom calendar */}
          {plan && plan.race_type !== 'custom' && currentWeekWorkouts.length > 0 && (
            <PlanWeekSummary
              plan={plan}
              weekWorkouts={currentWeekWorkouts}
              weekNumber={currentWeekNumber}
            />
          )}

          {/* AI Coach promo — unauthenticated users */}
          {!user && (
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

          {/* Create plan banner — authenticated users can always add more plans */}
          {user && (
            <TouchableOpacity
              style={styles.planBanner}
              onPress={() => router.push('/(tabs)/training/setup' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={20} color={Colors.accent} />
              <View style={styles.planBannerText}>
                <Text style={styles.planBannerTitle}>
                  {plans.filter((p) => p.race_type !== 'custom').length > 0
                    ? 'Add Another Training Plan'
                    : 'Create a Training Plan'}
                </Text>
                <Text style={styles.planBannerDesc}>
                  Set a race goal and let AI build your personalized plan
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
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

          {/* AI Chat FAB (when any AI plan exists) */}
          {plans.some((p) => p.race_type !== 'custom') && (
            <TouchableOpacity
              style={styles.chatFab}
              onPress={() => router.push('/(tabs)/training/chat' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={Colors.black} />
              <Text style={styles.chatFabText}>Adjust Plan</Text>
            </TouchableOpacity>
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
              {!user && (
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
              {user && (
                <TouchableOpacity
                  style={styles.planBanner}
                  onPress={() => router.push('/(tabs)/training/setup' as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={20} color={Colors.accent} />
                  <View style={styles.planBannerText}>
                    <Text style={styles.planBannerTitle}>
                      {plans.filter((p) => p.race_type !== 'custom').length > 0
                        ? 'Add Another Training Plan'
                        : 'Create a Training Plan'}
                    </Text>
                    <Text style={styles.planBannerDesc}>
                      Set a race goal and let AI build your plan
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
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

              {/* Fastest uphill pace highlight card */}
              {(() => {
                const uphillRecord = stats.records.find(
                  (r) => r.category === 'fastest_uphill_pace',
                );
                if (!uphillRecord) return null;
                return (
                  <View style={styles.uphillCard}>
                    <View style={styles.uphillIconBg}>
                      <Ionicons name="trending-up" size={22} color={Colors.primary} />
                    </View>
                    <View style={styles.uphillContent}>
                      <Text style={styles.uphillLabel}>Fastest Uphill Pace</Text>
                      <View style={styles.uphillValueRow}>
                        <Text style={styles.uphillValue}>{uphillRecord.displayValue}</Text>
                        <Text style={styles.uphillUnit}>/mi</Text>
                      </View>
                      <Text style={styles.uphillMeta} numberOfLines={1}>
                        {uphillRecord.workoutName}
                      </Text>
                    </View>
                  </View>
                );
              })()}

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

  // AI Coach promo card
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

  // Plan banner
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  planBannerText: {
    flex: 1,
  },
  planBannerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  planBannerDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Chat FAB
  chatFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  chatFabText: {
    color: Colors.black,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },

  // List view
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

  // Uphill pace card
  uphillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: Spacing.md,
  },
  uphillIconBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uphillContent: {
    flex: 1,
  },
  uphillLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  uphillValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  uphillValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  uphillUnit: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  uphillMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Stats
  chartsSection: {
    marginTop: Spacing.md,
  },
  chartsSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Empty
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
