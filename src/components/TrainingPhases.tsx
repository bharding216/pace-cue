/**
 * TrainingPhases — visual timeline of training plan phases.
 * Shows numbered phases with "Current" / "Upcoming" badges.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import type { PlanOutlineWeek } from '../types/database';

interface Phase {
  number: number;
  name: string;
  weekRange: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface TrainingPhasesProps {
  outline: PlanOutlineWeek[] | null;
  currentWeekNumber: number;
}

function derivePhases(outline: PlanOutlineWeek[] | null, currentWeek: number): Phase[] {
  if (!outline || outline.length === 0) return [];

  const themeGroups: { theme: string; weeks: number[] }[] = [];
  for (const week of outline) {
    const last = themeGroups[themeGroups.length - 1];
    if (last && last.theme === week.theme) {
      last.weeks.push(week.week_number);
    } else {
      themeGroups.push({ theme: week.theme, weeks: [week.week_number] });
    }
  }

  return themeGroups.map((group, i) => {
    const firstWeek = Math.min(...group.weeks);
    const lastWeek = Math.max(...group.weeks);
    const weekRange = firstWeek === lastWeek
      ? `Week ${firstWeek}`
      : `Weeks ${firstWeek}\u2013${lastWeek}`;

    let status: Phase['status'] = 'upcoming';
    if (currentWeek > lastWeek) status = 'completed';
    else if (currentWeek >= firstWeek && currentWeek <= lastWeek) status = 'current';

    return {
      number: i + 1,
      name: group.theme,
      weekRange,
      status,
    };
  });
}

export function TrainingPhases({ outline, currentWeekNumber }: TrainingPhasesProps) {
  const phases = derivePhases(outline, currentWeekNumber);

  if (phases.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Training phases</Text>
      {phases.map((phase, i) => (
        <View key={phase.number} style={styles.phaseRow}>
          <View style={[
            styles.phaseCircle,
            phase.status === 'current' && styles.phaseCircleCurrent,
            phase.status === 'completed' && styles.phaseCircleCompleted,
          ]}>
            <Text style={[
              styles.phaseNumber,
              phase.status === 'current' && styles.phaseNumberCurrent,
              phase.status === 'completed' && styles.phaseNumberCompleted,
            ]}>
              {phase.number}
            </Text>
          </View>

          {i < phases.length - 1 && (
            <View style={[
              styles.phaseLine,
              phase.status === 'completed' && styles.phaseLineCompleted,
            ]} />
          )}

          <View style={styles.phaseInfo}>
            <Text style={[
              styles.phaseName,
              phase.status === 'current' && styles.phaseNameCurrent,
            ]}>
              {phase.name}
            </Text>
            <Text style={styles.phaseWeeks}>{phase.weekRange}</Text>
          </View>

          <Text style={[
            styles.phaseBadge,
            phase.status === 'current' && styles.phaseBadgeCurrent,
            phase.status === 'completed' && styles.phaseBadgeCompleted,
          ]}>
            {phase.status === 'current' ? 'Current' :
             phase.status === 'completed' ? 'Done' : 'Upcoming'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  phaseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseCircleCurrent: {
    backgroundColor: Colors.primary,
  },
  phaseCircleCompleted: {
    backgroundColor: Colors.primary + '40',
  },
  phaseNumber: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  phaseNumberCurrent: {
    color: Colors.black,
  },
  phaseNumberCompleted: {
    color: Colors.primary,
  },
  phaseLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 24,
    backgroundColor: Colors.surfaceLight,
  },
  phaseLineCompleted: {
    backgroundColor: Colors.primary + '40',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  phaseNameCurrent: {
    color: Colors.textPrimary,
  },
  phaseWeeks: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  phaseBadge: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  phaseBadgeCurrent: {
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  phaseBadgeCompleted: {
    color: Colors.textMuted,
  },
});
