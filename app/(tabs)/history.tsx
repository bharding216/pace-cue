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
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CompletedWorkout, formatTime } from '../../src/workout/workoutTypes';
import { loadHistory, clearHistory } from '../../src/workout/workoutStorage';
import { exportData, importData } from '../../src/workout/backupManager';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function HistoryScreen() {
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportData();
    } catch (e: any) {
      Alert.alert('Export Failed', e.message ?? 'Something went wrong.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importData();
      if (result) {
        loadHistory().then(setHistory);
        Alert.alert(
          'Import Complete',
          `Restored ${result.workoutsCount} workout${result.workoutsCount !== 1 ? 's' : ''} and ${result.historyCount} history entr${result.historyCount !== 1 ? 'ies' : 'y'}.`
        );
      }
    } catch (e: any) {
      Alert.alert('Import Failed', e.message ?? 'Could not read backup file.');
    } finally {
      setImporting(false);
    }
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
          <View>
            {/* Import / Export row */}
            <View style={styles.backupRow}>
              <TouchableOpacity
                style={styles.backupBtn}
                onPress={handleExport}
                disabled={exporting}
                activeOpacity={0.7}
              >
                {exporting ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <Text style={styles.backupBtnIcon}>📤</Text>
                )}
                <Text style={styles.backupBtnLabel}>Export</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backupBtn}
                onPress={handleImport}
                disabled={importing}
                activeOpacity={0.7}
              >
                {importing ? (
                  <ActivityIndicator color={Colors.accent} size="small" />
                ) : (
                  <Text style={styles.backupBtnIcon}>📥</Text>
                )}
                <Text style={styles.backupBtnLabel}>Import</Text>
              </TouchableOpacity>
            </View>

            {history.length > 0 ? (
              <View style={styles.header}>
                <Text style={styles.count}>
                  {history.length} workout{history.length !== 1 ? 's' : ''} completed
                </Text>
                <TouchableOpacity onPress={handleClear}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
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
  backupRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
  },
  backupBtnIcon: {
    fontSize: 18,
  },
  backupBtnLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
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
