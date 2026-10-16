/**
 * DayDetail — shows detail for a selected calendar date.
 *
 * Renders two modes:
 * - Planned workout: day_label, description, intervals summary, Start/Skip actions
 * - Completed run: workout name, duration, distance, splits, share/edit/run-again
 * - Rest day: simple message
 * - Empty day: no content
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { DayEntry } from '../contexts/TrainingPlanContext';
import type { WorkoutDefinition } from '../workout/workoutTypes';
import { formatTime, totalWorkoutSeconds, flattenWorkout } from '../workout/workoutTypes';
import { Colors, Spacing, FontSize, BorderRadius, intervalColor } from '../constants/theme';

// ── Types ────────────────────────────────────────────────────

interface DayDetailProps {
  entry: DayEntry | undefined;
  selectedDate: string;
  onStartWorkout: (workoutData: WorkoutDefinition) => void;
  onSkipWorkout: (workoutId: string) => void;
  /** Called with the history entry ID to view run details. */
  onViewRun: (historyEntryId: string) => void;
  onRunAgain: (workoutId: string) => void;
  /** When provided, shows an "Add Workout" button on days without a planned workout. */
  onAddWorkout?: (date: string) => void;
  /** Called to generate detailed workout for a plan workout that lacks workout_data. */
  onGenerateDetail?: (workoutId: string) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(ms: number): string {
  return formatTime(Math.floor(ms / 1000));
}

const METERS_PER_MILE = 1609.344;

function formatDistance(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  return `${miles.toFixed(2)} mi`;
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case 'completed': return Colors.primary;
    case 'skipped': return Colors.textMuted;
    default: return Colors.accent;
  }
}

// ── Workout Preview (interval summary) ──────────────────────

function WorkoutPreview({ workoutData }: { workoutData: unknown }) {
  const workout = workoutData as WorkoutDefinition;
  if (!workout || !workout.blocks) return null;

  const flat = flattenWorkout(workout);
  const totalSec = totalWorkoutSeconds(workout);

  return (
    <View style={styles.workoutPreview}>
      <Text style={styles.workoutName}>{workout.name}</Text>
      <Text style={styles.workoutDuration}>
        {formatTime(totalSec)} total · {flat.length} intervals
      </Text>
      <View style={styles.intervalList}>
        {flat.slice(0, 6).map((interval, i) => (
          <View key={i} style={styles.intervalRow}>
            <View style={[styles.intervalDot, { backgroundColor: intervalColor(interval.type) }]} />
            <Text style={styles.intervalLabel} numberOfLines={1}>
              {interval.label}
            </Text>
            <Text style={styles.intervalTime}>
              {formatTime(interval.durationSeconds)}
            </Text>
          </View>
        ))}
        {flat.length > 6 && (
          <Text style={styles.moreIntervals}>
            +{flat.length - 6} more
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Main Component ──────────────────────────────────────────

export function DayDetail({
  entry,
  selectedDate,
  onStartWorkout,
  onSkipWorkout,
  onViewRun,
  onRunAgain,
  onAddWorkout,
  onGenerateDetail,
}: DayDetailProps) {
  const dateDisplay = formatDateDisplay(selectedDate);
  const [generatingDetail, setGeneratingDetail] = useState(false);

  // Empty day
  if (!entry || (!entry.planWorkout && entry.completedRuns.length === 0)) {
    return (
      <View style={styles.container}>
        <Text style={styles.dateHeader}>{dateDisplay}</Text>
        <View style={styles.emptyDay}>
          <Ionicons name="sunny-outline" size={24} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No activity</Text>
        </View>
        {onAddWorkout && (
          <TouchableOpacity
            style={styles.addWorkoutBtn}
            onPress={() => onAddWorkout(selectedDate)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addWorkoutBtnText}>Add Workout to This Day</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.dateHeader}>{dateDisplay}</Text>

      {/* Planned workout */}
      {entry.planWorkout && (
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor(entry.planWorkout.status) + '22' }]}>
              <Text style={[styles.statusText, { color: statusBadgeColor(entry.planWorkout.status) }]}>
                {entry.planWorkout.status === 'planned' ? 'Planned' :
                 entry.planWorkout.status === 'completed' ? 'Completed' : 'Skipped'}
              </Text>
            </View>
            <Text style={styles.dayLabel}>{entry.planWorkout.day_label}</Text>
          </View>

          {entry.planWorkout.description && (
            <Text style={styles.description}>{entry.planWorkout.description}</Text>
          )}

          {entry.planWorkout.workout_data && entry.planWorkout.status !== 'completed' && (
            <WorkoutPreview workoutData={entry.planWorkout.workout_data} />
          )}

          {/* Has workout_data — show Start + Skip */}
          {entry.planWorkout.status === 'planned' && entry.planWorkout.workout_data && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => onStartWorkout(entry.planWorkout!.workout_data as WorkoutDefinition)}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={16} color={Colors.black} />
                <Text style={styles.startBtnText}>Start Workout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => onSkipWorkout(entry.planWorkout!.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* No workout_data yet — show Generate button for upcoming non-rest days */}
          {entry.planWorkout.status === 'planned' &&
            !entry.planWorkout.workout_data &&
            entry.planWorkout.day_label !== 'Rest Day' && (
            <View style={styles.actionRow}>
              {onGenerateDetail ? (
                <TouchableOpacity
                  style={styles.generateDetailBtn}
                  onPress={async () => {
                    setGeneratingDetail(true);
                    try {
                      await onGenerateDetail(entry.planWorkout!.id);
                    } finally {
                      setGeneratingDetail(false);
                    }
                  }}
                  disabled={generatingDetail}
                  activeOpacity={0.8}
                >
                  {generatingDetail ? (
                    <ActivityIndicator size="small" color={Colors.black} />
                  ) : (
                    <Ionicons name="sparkles" size={16} color={Colors.black} />
                  )}
                  <Text style={styles.generateDetailBtnText}>
                    {generatingDetail ? 'Generating…' : 'Generate Workout'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.outlineOnlyHint}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.outlineOnlyText}>
                    Workout details will be generated as this day approaches
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => onSkipWorkout(entry.planWorkout!.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {entry.planWorkout.day_label === 'Rest Day' && (
            <View style={styles.restDay}>
              <Ionicons name="bed-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.restDayText}>Rest and recover</Text>
            </View>
          )}
        </View>
      )}

      {/* Add workout button — show when there's no planned workout for this day */}
      {!entry.planWorkout && onAddWorkout && (
        <TouchableOpacity
          style={styles.addWorkoutBtn}
          onPress={() => onAddWorkout(selectedDate)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addWorkoutBtnText}>Add Workout to This Day</Text>
        </TouchableOpacity>
      )}

      {/* Completed runs */}
      {entry.completedRuns.map((run) => (
        <View key={run.id} style={styles.runCard}>
          <View style={styles.runHeader}>
            <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '22' }]}>
              <Ionicons name="checkmark" size={12} color={Colors.primary} />
              <Text style={[styles.statusText, { color: Colors.primary }]}>Completed</Text>
            </View>
            <Text style={styles.runName}>{run.workoutName}</Text>
          </View>

          <View style={styles.runStats}>
            <View style={styles.runStat}>
              <Text style={styles.runStatValue}>{formatDuration(run.totalDurationMs)}</Text>
              <Text style={styles.runStatLabel}>Duration</Text>
            </View>
            {run.totalDistanceMeters != null && run.totalDistanceMeters > 0 && (
              <View style={styles.runStat}>
                <Text style={styles.runStatValue}>{formatDistance(run.totalDistanceMeters)}</Text>
                <Text style={styles.runStatLabel}>Distance</Text>
              </View>
            )}
            {run.splits && (
              <View style={styles.runStat}>
                <Text style={styles.runStatValue}>{run.splits.length}</Text>
                <Text style={styles.runStatLabel}>Splits</Text>
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => onViewRun(run.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={14} color={Colors.black} />
              <Text style={styles.primaryBtnText}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => onRunAgain(run.workoutId)}
              activeOpacity={0.7}
            >
              <Ionicons name="play" size={14} color={Colors.textPrimary} />
              <Text style={styles.secondaryBtnText}>Run Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  dateHeader: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },

  // Plan card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  planHeader: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },

  // Workout preview
  workoutPreview: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  workoutName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  workoutDuration: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  intervalList: {
    gap: 4,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  intervalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  intervalLabel: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  intervalTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  moreIntervals: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  startBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  skipBtn: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  skipBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  generateDetailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  generateDetailBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  outlineOnlyHint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  outlineOnlyText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Rest day
  restDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  restDayText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Add workout button
  addWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '44',
    borderStyle: 'dashed',
  },
  addWorkoutBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Run card
  runCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  runHeader: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  runName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  runStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  runStat: {
    gap: 2,
  },
  runStatValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
  runStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  primaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
