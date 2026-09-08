import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../constants/theme';
import { intervalColor } from '../constants/theme';

interface IntervalProgressProps {
  progress: number; // 0..1
  intervalType: string;
}

export function IntervalProgress({
  progress,
  intervalType,
}: IntervalProgressProps) {
  const color = intervalColor(intervalType);

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${Math.min(100, progress * 100)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
