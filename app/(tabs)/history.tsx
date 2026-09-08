/**
 * History screen — shows completed workouts.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CompletedWorkout, formatTime } from '../../src/workout/workoutTypes';
import { loadHistory, clearHistory } from '../../src/workout/workoutStorage';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function HistoryScreen() {
  const [history, setHistory] = useState<CompletedWorkout[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, [])
  );

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'Delete all workout history? This can\'t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const formatDate = (epoch: number) => {
    const d = new Date(epoch);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    return formatTime(totalSec);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          history.length > 0 ? (
            <View style={styles.header}>
              <Text style={styles.count}>
                {history.length} workout{history.length !== 1 ? 's' : ''} completed
              </Text>
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.workoutName}>{item.workoutName}</Text>
              <Text style={styles.date}>{formatDate(item.completedAt)}</Text>
            </View>
            <Text style={styles.durationText}>
              {formatDuration(item.totalDurationMs)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>
              Complete a workout and it'll show up here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  count: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  clearText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  durationText: {
    fontSize: FontSize.lg,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: Spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
