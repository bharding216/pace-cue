/**
 * Line chart for showing improvement trends over time.
 *
 * Renders an SVG sparkline with:
 *   - Smoothed trend line
 *   - Data point dots
 *   - Min/max labels
 *   - PB marker (best value highlighted)
 *
 * Uses react-native-svg (already in the project for ElevationProfile).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect, G } from 'react-native-svg';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import type { TrendPoint } from '../stats/personalRecords';

interface Props {
  data: TrendPoint[];
  title: string;
  /** Format a raw value for axis labels. */
  formatValue: (value: number) => string;
  /** If true, lower values are better (e.g. pace). Affects PB highlighting. */
  lowerIsBetter?: boolean;
  width: number;
  height?: number;
  /** Accent color for the line. Defaults to primary green. */
  color?: string;
}

const PADDING = { top: 8, bottom: 28, left: 42, right: 12 };

export function ProgressChart({
  data,
  title,
  formatValue,
  lowerIsBetter = false,
  width,
  height = 160,
  color = Colors.primary,
}: Props) {
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const drawW = width - PADDING.left - PADDING.right;
    const drawH = height - PADDING.top - PADDING.bottom;

    const dates = data.map((d) => d.date);
    const values = data.map((d) => d.value);
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const dateRange = maxDate - minDate || 1;
    const valRange = maxVal - minVal || 1;
    const valPadding = valRange * 0.1;

    const xScale = (d: number) =>
      PADDING.left + ((d - minDate) / dateRange) * drawW;
    const yScale = (v: number) =>
      PADDING.top + drawH - ((v - (minVal - valPadding)) / (valRange + valPadding * 2)) * drawH;

    // Build line path
    const points = data.map((d) => ({
      x: xScale(d.date),
      y: yScale(d.value),
      value: d.value,
      date: d.date,
    }));

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth curve using cubic bezier
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Find the personal best point
    const bestIdx = lowerIsBetter
      ? values.indexOf(minVal)
      : values.indexOf(maxVal);

    // Y-axis labels (3 ticks)
    const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => ({
      y: yScale(v),
      label: formatValue(v),
    }));

    // X-axis labels (first and last date)
    const formatDate = (epoch: number) => {
      const d = new Date(epoch);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    const xLabels = [
      { x: PADDING.left, label: formatDate(minDate) },
      { x: PADDING.left + drawW, label: formatDate(maxDate) },
    ];

    return { linePath, points, bestIdx, yTicks, xLabels, drawW, drawH };
  }, [data, width, height, lowerIsBetter, formatValue]);

  if (!chart || data.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.emptyChart, { width, height: height - 28 }]}>
          <Text style={styles.emptyText}>Not enough data yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {chart.yTicks.map((tick, i) => (
          <Line
            key={`grid-${i}`}
            x1={PADDING.left}
            y1={tick.y}
            x2={PADDING.left + chart.drawW}
            y2={tick.y}
            stroke={Colors.surfaceLight}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}

        {/* Trend line */}
        <Path
          d={chart.linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Gradient fill under the line */}
        <Path
          d={
            chart.linePath +
            ` L ${chart.points[chart.points.length - 1].x} ${PADDING.top + chart.drawH}` +
            ` L ${chart.points[0].x} ${PADDING.top + chart.drawH} Z`
          }
          fill={color}
          opacity={0.08}
        />

        {/* Data point dots */}
        {chart.points.map((pt, i) => (
          <Circle
            key={`dot-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={i === chart.bestIdx ? 5 : 3}
            fill={i === chart.bestIdx ? color : Colors.surface}
            stroke={i === chart.bestIdx ? Colors.white : color}
            strokeWidth={i === chart.bestIdx ? 2 : 1.5}
          />
        ))}

        {/* PB star marker */}
        {chart.bestIdx >= 0 && (
          <G>
            <Circle
              cx={chart.points[chart.bestIdx].x}
              cy={chart.points[chart.bestIdx].y}
              r={10}
              fill={color}
              opacity={0.2}
            />
          </G>
        )}
      </Svg>

      {/* Axis labels (rendered as RN Text for clarity) */}
      <View style={[styles.yAxisLabels, { height }]}>
        {chart.yTicks.map((tick, i) => (
          <Text
            key={`ytick-${i}`}
            style={[styles.axisLabel, { position: 'absolute', top: tick.y - 6, left: 0 }]}
          >
            {tick.label}
          </Text>
        ))}
      </View>

      <View style={styles.xAxisLabels}>
        {chart.xLabels.map((lbl, i) => (
          <Text
            key={`xlbl-${i}`}
            style={[
              styles.axisLabel,
              i === 1 && { textAlign: 'right' },
            ]}
          >
            {lbl.label}
          </Text>
        ))}
      </View>

      {/* PB callout */}
      {chart.bestIdx >= 0 && (
        <View style={[styles.pbBadge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.pbText, { color }]}>
            PB: {formatValue(data[chart.bestIdx].value)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyChart: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  yAxisLabels: {
    position: 'absolute',
    top: 28,
    left: 0,
    width: PADDING.left - 4,
  },
  axisLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING.left,
    marginTop: -20,
  },
  pbBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  pbText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
