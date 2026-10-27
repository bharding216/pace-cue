/**
 * Run Details screen — shows the full results of a completed workout:
 * splits table, route map, elevation profile, awards, tags.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CompletedWorkout, IntervalSplit, formatTime, generateId } from '../../src/workout/workoutTypes';
import { loadHistory, loadWorkouts, loadSettings, saveWorkout } from '../../src/workout/workoutStorage';
import { setTempWorkout } from '../../src/workout/tempWorkoutCache';
import { DEFAULT_SETTINGS } from '../../src/workout/workoutTypes';
import type { PaceUnit } from '../../src/pace/paceTypes';
import { RouteMap } from '../../src/components/RouteMap';
import { ElevationProfile } from '../../src/components/ElevationProfile';
import { TerrainSummary } from '../../src/components/TerrainSummary';
import { TagBadges } from '../../src/components/TagPicker';
import { analyzeElevation, aggregateByTerrain } from '../../src/pace/elevationAnalysis';
import { computeStats, detectNewRecords, detectNewAwards } from '../../src/stats/personalRecords';
import { NewRecordsBanner } from '../../src/components/PersonalBests';
import { shareWorkoutResults } from '../../src/sharing/shareWorkout';
import { Colors, Spacing, FontSize, BorderRadius, intervalColor } from '../../src/constants/theme';

const METERS_PER_MILE = 1609.344;

function formatDistanceDisplay(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  if (miles >= 0.1) return `${miles.toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatPaceDisplay(paceMinutes: number | null): string {
  if (paceMinutes == null || !isFinite(paceMinutes)) return '--:--';
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDateFull(epoch: number): string {
  return new Date(epoch).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeOfDay(epoch: number): string {
  return new Date(epoch).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Splits Table ─────────────────────────────────────────────

function SplitsTable({ splits }: { splits: IntervalSplit[] }) {
  const hasPace = splits.some((s) => s.avgPaceMinPerMile != null);
  const hasDist = splits.some((s) => s.distanceMeters != null);
  const hasTarget = splits.some((s) => s.targetPace != null);

  return (
    <View style={splitStyles.container}>
      <Text style={splitStyles.title}>Splits</Text>
      <View style={splitStyles.headerRow}>
        <Text style={[splitStyles.headerCell, splitStyles.labelCol]}>#</Text>
        <Text style={[splitStyles.headerCell, splitStyles.labelCol, { flex: 1 }]}>Interval</Text>
        <Text style={[splitStyles.headerCell, splitStyles.valueCol]}>Time</Text>
        {hasTarget && <Text style={[splitStyles.headerCell, splitStyles.valueCol]}>Target</Text>}
        {hasPace && <Text style={[splitStyles.headerCell, splitStyles.valueCol]}>Pace</Text>}
        {hasDist && <Text style={[splitStyles.headerCell, splitStyles.valueCol]}>Dist</Text>}
      </View>
      {splits.map((split, i) => {
        const actualSec = Math.floor(split.actualDurationMs / 1000);
        const paceStr = formatPaceDisplay(split.avgPaceMinPerMile);
        const distStr =
          split.distanceMeters != null
            ? split.distanceMeters >= 160.9
              ? `${(split.distanceMeters / METERS_PER_MILE).toFixed(2)}`
              : `${Math.round(split.distanceMeters)}m`
            : '—';

        let paceColor = Colors.textSecondary;
        if (split.targetPace != null && split.avgPaceMinPerMile != null && isFinite(split.avgPaceMinPerMile)) {
          const diff = split.avgPaceMinPerMile - split.targetPace;
          if (Math.abs(diff) < 0.15) paceColor = Colors.primary;
          else if (diff > 0) paceColor = Colors.danger;
          else paceColor = Colors.accent;
        }

        return (
          <View key={i} style={[splitStyles.row, i % 2 === 0 && splitStyles.rowAlt]}>
            <Text style={[splitStyles.cell, splitStyles.labelCol, { color: Colors.textMuted }]}>{i + 1}</Text>
            <View style={[splitStyles.labelCol, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <View style={[splitStyles.typeDot, { backgroundColor: intervalColor(split.type) }]} />
              <Text style={splitStyles.cell} numberOfLines={1}>{split.label}</Text>
            </View>
            <Text style={[splitStyles.cell, splitStyles.valueCol, { fontVariant: ['tabular-nums'] }]}>
              {formatTime(actualSec)}
            </Text>
            {hasTarget && (
              <Text style={[splitStyles.cell, splitStyles.valueCol, { color: Colors.textMuted, fontVariant: ['tabular-nums'] }]}>
                {split.targetPace != null ? formatPaceDisplay(split.targetPace) : '—'}
              </Text>
            )}
            {hasPace && (
              <Text style={[splitStyles.cell, splitStyles.valueCol, { color: paceColor, fontVariant: ['tabular-nums'] }]}>
                {paceStr}
              </Text>
            )}
            {hasDist && (
              <Text style={[splitStyles.cell, splitStyles.valueCol, { fontVariant: ['tabular-nums'] }]}>
                {distStr}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────

export default function RunDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [run, setRun] = useState<CompletedWorkout | null>(null);
  const [paceUnit, setPaceUnit] = useState<PaceUnit>(DEFAULT_SETTINGS.paceUnit);
  const [loading, setLoading] = useState(true);

  const chartWidth = screenWidth - Spacing.lg * 2;

  useEffect(() => {
    Promise.all([loadHistory(), loadSettings()]).then(([history, settings]) => {
      const found = history.find((h) => h.id === id);
      setRun(found ?? null);
      setPaceUnit(settings.paceUnit);
      setLoading(false);
    });
  }, [id]);

  const allHistory = useMemo(() => {
    if (!run) return [];
    // We already loaded it; re-derive lazily isn't great but keeps it simple
    return [];
  }, [run]);

  const { records, newRecords, newAwards } = useMemo(() => {
    if (!run) return { records: [], newRecords: [], newAwards: [] };
    // Load synchronously from state isn't possible, so we do a secondary load
    return { records: [], newRecords: [], newAwards: [] };
  }, [run]);

  // Secondary load for records
  const [statsRecords, setStatsRecords] = useState<import('../../src/stats/personalRecords').PersonalRecord[]>([]);
  const [runRecords, setRunRecords] = useState<import('../../src/stats/personalRecords').PersonalRecord[]>([]);
  const [runAwards, setRunAwards] = useState<import('../../src/stats/personalRecords').AwardBadge[]>([]);

  useEffect(() => {
    if (!run) return;
    loadHistory().then((history) => {
      const stats = computeStats(history);
      setStatsRecords(stats.records);
      setRunRecords(detectNewRecords(history, run.id));
      setRunAwards(detectNewAwards(history, run.id));
    });
  }, [run?.id]);

  const elevation = useMemo(() => {
    if (!run?.route || run.route.length < 2) return null;
    return analyzeElevation(run.route);
  }, [run?.route]);

  const terrainAggs = useMemo(() => {
    if (!elevation) return [];
    return aggregateByTerrain(elevation.segments);
  }, [elevation]);

  const handleUseAsTemplate = async () => {
    if (!run) return;
    const source = run.configuration
      ?? (await loadWorkouts()).find((w) => w.id === run.workoutId);
    if (source) {
      const newId = generateId();
      const copy = {
        ...source,
        id: newId,
        name: `${source.name || run.workoutName} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveWorkout(copy);
      router.push(`/workout/${newId}`);
    }
  };

  const handleShare = async () => {
    if (!run) return;
    const workouts = await loadWorkouts();
    const def = workouts.find((w) => w.id === run.workoutId) ?? null;
    shareWorkoutResults(def, run);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Run Not Found</Text>
        <Text style={styles.emptyText}>This run may have been deleted.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: run.workoutName,
        }}
      />
      <Stack.Screen.BackButton>Training</Stack.Screen.BackButton>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDateFull(run.completedAt)}</Text>
          <Text style={styles.timeText}>Completed at {formatTimeOfDay(run.completedAt)}</Text>
        </View>

        {/* Key stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {formatTime(Math.floor(run.totalDurationMs / 1000))}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          {run.totalDistanceMeters != null && run.totalDistanceMeters > 0 && (
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.accent }]}>
                {formatDistanceDisplay(run.totalDistanceMeters)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          )}
          {run.splits && run.splits.length > 0 && (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{run.splits.length}</Text>
              <Text style={styles.statLabel}>Splits</Text>
            </View>
          )}
        </View>

        {/* Awards from this run */}
        {(runRecords.length > 0 || runAwards.length > 0) && (
          <NewRecordsBanner records={runRecords} awards={runAwards} />
        )}

        {/* Tags */}
        {run.tags && run.tags.length > 0 && (
          <View style={styles.section}>
            <TagBadges tags={run.tags} />
          </View>
        )}

        {/* Route map */}
        {run.route && run.route.length >= 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route</Text>
            <RouteMap
              route={run.route}
              splits={run.splits}
              paceUnit={paceUnit}
              height={280}
              records={statsRecords}
            />
          </View>
        )}

        {/* Elevation */}
        {elevation && run.route && (
          <View style={styles.section}>
            <ElevationProfile
              route={run.route}
              summary={elevation}
              paceUnit={paceUnit}
              width={chartWidth}
            />
            {terrainAggs.length > 0 && (
              <TerrainSummary aggregates={terrainAggs} paceUnit={paceUnit} />
            )}
          </View>
        )}

        {/* Splits */}
        {run.splits && run.splits.length > 0 && (
          <View style={styles.section}>
            <SplitsTable splits={run.splits} />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (run.configuration) {
                const draft = { ...run.configuration, id: generateId(), updatedAt: Date.now() };
                setTempWorkout(draft, { templateId: run.templateId });
                router.push(`/workout/run/${draft.id}`);
              } else {
                router.push(`/workout/run/${run.workoutId}`);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="play" size={16} color={Colors.black} />
            <Text style={styles.actionBtnText}>Run Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={16} color={Colors.textPrimary} />
            <Text style={styles.actionBtnSecondaryText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.templateBtn}
          onPress={handleUseAsTemplate}
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={16} color={Colors.primary} />
          <Text style={styles.templateBtnText}>Use Workout as Template</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────

const splitStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  headerCell: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  rowAlt: {
    backgroundColor: Colors.surfaceLight + '44',
  },
  cell: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  labelCol: {
    minWidth: 24,
  },
  valueCol: {
    minWidth: 48,
    textAlign: 'right',
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

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
  header: {
    marginBottom: Spacing.lg,
  },
  dateText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionBtnSecondaryText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '44',
    borderStyle: 'dashed',
    gap: Spacing.xs,
  },
  templateBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});
