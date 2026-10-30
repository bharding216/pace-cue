import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { computeStats } from '../../../src/stats/personalRecords';
import type { StatsSnapshot } from '../../../src/stats/personalRecords';
import { RecordsGrid, AwardsList, LifetimeStats } from '../../../src/components/PersonalBests';
import { ProgressChart } from '../../../src/components/ProgressChart';
import { Colors, Spacing, FontSize } from '../../../src/constants/theme';

export default function StatsScreen() {
  const { history } = useTrainingPlan();

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

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="stats-chart-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No stats yet</Text>
        <Text style={styles.emptyText}>
          Complete some workouts to see your stats and progress.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  chartsSection: {
    marginTop: Spacing.md,
  },
  chartsSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
