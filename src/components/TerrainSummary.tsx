/**
 * Terrain pace summary — shows uphill / flat / downhill aggregate stats.
 *
 * Renders a compact card for each terrain type with average pace, distance,
 * and elevation change. Matches the PaceCue dark-theme design language.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TerrainAggregate, TerrainType } from '../pace/elevationAnalysis';
import type { PaceUnit } from '../pace/paceTypes';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface Props {
  aggregates: TerrainAggregate[];
  paceUnit: PaceUnit;
}

const METERS_PER_MILE = 1_609.344;

const TERRAIN_META: Record<
  TerrainType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  uphill: { label: 'Uphill', icon: 'arrow-up', color: '#F87171' },
  flat: { label: 'Flat', icon: 'remove', color: '#60A5FA' },
  downhill: { label: 'Downhill', icon: 'arrow-down', color: '#4ADE80' },
};

function formatPace(paceMinutes: number | null): string {
  if (paceMinutes == null || !isFinite(paceMinutes)) return '--:--';
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDist(meters: number, unit: PaceUnit): string {
  if (unit === 'minPerMile') {
    const miles = meters / METERS_PER_MILE;
    return `${miles.toFixed(2)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

function formatElev(meters: number, unit: PaceUnit): string {
  if (unit === 'minPerMile') {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${Math.round(meters)} m`;
}

export function TerrainSummary({ aggregates, paceUnit }: Props) {
  if (aggregates.length === 0) return null;

  const paceLabel = paceUnit === 'minPerMile' ? '/mi' : '/km';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Terrain Pace</Text>
      <View style={styles.cards}>
        {aggregates.map((agg) => {
          const meta = TERRAIN_META[agg.type];
          const pace =
            paceUnit === 'minPerMile'
              ? agg.avgPaceMinPerMile
              : agg.avgPaceMinPerKm;

          return (
            <View
              key={agg.type}
              style={[styles.card, { borderLeftColor: meta.color }]}
            >
              <View style={styles.cardHeader}>
                <Ionicons
                  name={meta.icon}
                  size={14}
                  color={meta.color}
                />
                <Text style={[styles.cardLabel, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>

              <Text style={styles.paceValue}>
                {formatPace(pace)}
                <Text style={styles.paceUnit}>{paceLabel}</Text>
              </Text>

              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>
                  {formatDist(agg.totalDistanceMeters, paceUnit)}
                </Text>
                <Text style={styles.metaSep}>{' · '}</Text>
                <Text style={styles.metaText}>
                  {agg.type === 'downhill' ? '↓' : '↑'}{' '}
                  {formatElev(Math.abs(agg.totalElevationChange), paceUnit)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  cards: {
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paceValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  paceUnit: {
    fontSize: FontSize.sm,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  metaSep: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
});
