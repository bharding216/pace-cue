/**
 * WorkoutStructure — visual breakdown of a workout's warmup, blocks, and cooldown.
 * Shows colored bars with interval details, targets, and durations.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WorkoutDefinition } from '../workout/workoutTypes';
import { formatTime, flattenWorkout } from '../workout/workoutTypes';
import { Colors, Spacing, FontSize, BorderRadius, intervalColor } from '../constants/theme';

interface WorkoutStructureProps {
  workout: WorkoutDefinition;
}

interface StructureSegment {
  label: string;
  detail: string;
  color: string;
  type: string;
}

function getSegments(workout: WorkoutDefinition): StructureSegment[] {
  const segments: StructureSegment[] = [];

  // Warmup
  if (workout.warmup && workout.warmup.length > 0) {
    const totalSecs = workout.warmup.reduce((sum: number, s: any) => sum + (s.durationSeconds || 0), 0);
    segments.push({
      label: 'Warmup',
      detail: totalSecs > 0 ? `${Math.round(totalSecs / 60)} minutes \u00B7 Easy` : 'Easy',
      color: Colors.warmup,
      type: 'warmup',
    });
  }

  // Blocks
  for (const block of (workout.blocks || [])) {
    const b = block as any;
    if (b.repeat && b.repeat > 1 && b.intervals?.length > 0) {
      const mainInterval = b.intervals[0];
      const recoveryInterval = b.intervals.length > 1 ? b.intervals[1] : null;
      let label = `${b.repeat} \u00D7 `;

      if (mainInterval.targetDistanceMeters) {
        label += `${mainInterval.targetDistanceMeters}m`;
      } else if (mainInterval.durationSeconds) {
        label += formatTime(mainInterval.durationSeconds);
      }

      let detail = '';
      if (mainInterval.targetPaceMinPerMile) {
        const pace = mainInterval.targetPaceMinPerMile;
        const mins = Math.floor(pace);
        const secs = Math.round((pace - mins) * 60);
        detail = `Target ${mins}:${secs.toString().padStart(2, '0')}/mi`;
      }
      if (recoveryInterval) {
        const recSecs = recoveryInterval.durationSeconds || 0;
        detail += detail ? ` \u00B7 ${recSecs}s recovery` : `${recSecs}s recovery`;
      }

      segments.push({
        label,
        detail: detail || (mainInterval.type === 'hard' ? 'Hard' : mainInterval.type || 'Run'),
        color: intervalColor(mainInterval.type || 'hard'),
        type: mainInterval.type || 'hard',
      });
    } else if (b.intervals?.length > 0) {
      for (const interval of b.intervals) {
        const int = interval as any;
        let label = int.label || int.type || 'Run';
        if (int.durationSeconds) {
          label += ` \u00B7 ${formatTime(int.durationSeconds)}`;
        }
        segments.push({
          label,
          detail: int.targetPaceMinPerMile
            ? `${Math.floor(int.targetPaceMinPerMile)}:${Math.round((int.targetPaceMinPerMile % 1) * 60).toString().padStart(2, '0')}/mi`
            : '',
          color: intervalColor(int.type || 'easy'),
          type: int.type || 'easy',
        });
      }
    }
  }

  // Cooldown
  if (workout.cooldown && workout.cooldown.length > 0) {
    const totalSecs = workout.cooldown.reduce((sum: number, s: any) => sum + (s.durationSeconds || 0), 0);
    segments.push({
      label: 'Cooldown',
      detail: totalSecs > 0 ? `${Math.round(totalSecs / 60)} minutes \u00B7 Easy` : 'Easy',
      color: Colors.cooldown,
      type: 'cooldown',
    });
  }

  return segments;
}

export function WorkoutStructure({ workout }: WorkoutStructureProps) {
  const segments = getSegments(workout);

  if (segments.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Structure</Text>
      {segments.map((seg, i) => (
        <View key={i} style={styles.segmentRow}>
          <View style={[styles.segmentBar, { backgroundColor: seg.color }]} />
          <View style={styles.segmentInfo}>
            <Text style={styles.segmentLabel}>{seg.label}</Text>
            {seg.detail ? <Text style={styles.segmentDetail}>{seg.detail}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: Spacing.sm,
    minHeight: 44,
  },
  segmentBar: {
    width: 4,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  segmentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  segmentDetail: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
