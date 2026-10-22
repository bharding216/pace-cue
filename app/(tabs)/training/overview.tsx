/**
 * Plan Overview screen — "Where is this training taking me?"
 *
 * Shows race-goal header, training phases, weekly breakdown,
 * and an "Adjust My Plan" button.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { TrainingPhases } from '../../../src/components/TrainingPhases';
import { ContextualProPrompt } from '../../../src/components/ContextualProPrompt';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

function formatRaceLabel(raceType: string): string {
  switch (raceType) {
    case '5k': return '5K';
    case '10k': return '10K';
    case 'half_marathon': return 'Half Marathon';
    case 'marathon': return 'Marathon';
    default: return 'Training';
  }
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PlanOverviewScreen() {
  const router = useRouter();
  const { plans, planWorkouts } = useTrainingPlan();

  const primaryPlan = useMemo(
    () => plans.find((p) => p.race_type !== 'custom') ?? null,
    [plans],
  );

  const currentWeekNumber = useMemo(() => {
    if (!primaryPlan) return 0;
    const today = new Date();
    const start = new Date(primaryPlan.start_date);
    return Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  }, [primaryPlan]);

  const totalWeeks = useMemo(() => {
    if (!primaryPlan) return 0;
    const start = new Date(primaryPlan.start_date);
    const end = new Date(primaryPlan.race_date);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  }, [primaryPlan]);

  const currentWeekWorkouts = useMemo(() => {
    if (!primaryPlan) return [];
    return planWorkouts
      .filter((w) => w.plan_id === primaryPlan.id && w.week_number === currentWeekNumber)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [planWorkouts, currentWeekNumber, primaryPlan]);

  const handleWorkoutPress = useCallback((date: string) => {
    router.back();
  }, [router]);

  if (!primaryPlan) {
    return (
      <View style={styles.centered}>
        <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Active Plan</Text>
        <Text style={styles.emptyText}>Create a training plan first.</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(tabs)/training/setup' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.createBtnText}>Create Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Plan header */}
      <View style={styles.header}>
        <Text style={styles.planTitle}>{primaryPlan.title || formatRaceLabel(primaryPlan.race_type)}</Text>
        <Text style={styles.planSubtitle}>
          {totalWeeks}-week training program
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{currentWeekNumber} / {totalWeeks}</Text>
          <Text style={styles.statLabel}>Current week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{primaryPlan.days_per_week}</Text>
          <Text style={styles.statLabel}>Runs / week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {new Date(primaryPlan.race_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.statLabel}>Race day</Text>
        </View>
      </View>

      {/* Training phases */}
      <TrainingPhases
        outline={primaryPlan.outline}
        currentWeekNumber={currentWeekNumber}
      />

      {/* This Week */}
      <View style={styles.weekSection}>
        <View style={styles.weekHeader}>
          <Text style={styles.weekTitle}>This Week</Text>
          <Text style={styles.weekLabel}>Week {currentWeekNumber}</Text>
        </View>

        {currentWeekWorkouts.length > 0 ? (
          currentWeekWorkouts.map((pw) => {
            const dayName = DAY_NAMES[new Date(pw.date + 'T12:00:00').getDay()];
            return (
              <TouchableOpacity
                key={pw.id}
                style={styles.weekWorkout}
                onPress={() => handleWorkoutPress(pw.date)}
                activeOpacity={0.7}
              >
                <Text style={styles.weekDay}>{dayName}</Text>
                <View style={styles.weekWorkoutInfo}>
                  <Text style={styles.weekWorkoutName} numberOfLines={1}>
                    {pw.day_label || 'Training'}
                  </Text>
                  {pw.description && (
                    <Text style={styles.weekWorkoutDesc} numberOfLines={1}>{pw.description}</Text>
                  )}
                </View>
                {pw.status === 'completed' ? (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                ) : pw.status === 'skipped' ? (
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.weekEmpty}>No workouts scheduled this week.</Text>
        )}
      </View>

      {/* Race prediction teaser */}
      <ContextualProPrompt
        momentId="race_prediction_teaser"
        onUpgrade={() => router.push('/paywall' as any)}
      />

      {/* Adjust plan button */}
      <TouchableOpacity
        style={styles.adjustBtn}
        onPress={() => router.push('/(tabs)/training/chat' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={18} color={Colors.black} />
        <Text style={styles.adjustBtnText}>Adjust My Plan</Text>
      </TouchableOpacity>
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
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl * 2,
    marginTop: Spacing.md,
  },
  createBtnText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  // Header
  header: {
    marginBottom: Spacing.lg,
  },
  planTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  planSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.surfaceLight,
  },

  // Week section
  weekSection: {
    marginBottom: Spacing.lg,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  weekTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weekLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  weekWorkout: {
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
  weekDay: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    width: 36,
  },
  weekWorkoutInfo: {
    flex: 1,
  },
  weekWorkoutName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weekWorkoutDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  weekEmpty: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // Adjust button
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  adjustBtnText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
});
