import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatTime } from '../workout/workoutTypes';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { intervalColor } from '../constants/theme';

interface TimerProps {
  remainingSeconds: number;
  intervalType: string;
  label: string;
}

export function Timer({ remainingSeconds, intervalType, label }: TimerProps) {
  const color = intervalColor(intervalType);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.time, { color }]}>
        {formatTime(remainingSeconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  time: {
    fontSize: Colors.white ? FontSize.timer : FontSize.timer, // always timer size
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
});
