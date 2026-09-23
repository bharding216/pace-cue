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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CompletedWorkout, formatTime } from '../../src/workout/workoutTypes';
import { loadHistory, clearHistory } from '../../src/workout/workoutStorage';
import { exportData, importData } from '../../src/workout/backupManager';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (epoch: number) => {
    const d = new Date(epoch);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeOfDay = (epoch: number) => {
    const d = new Date(epoch);
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
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
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity
              style={[styles.card, isExpanded && styles.cardExpanded]}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <Text style={styles.workoutName}>{item.workoutName}</Text>
                <Text style={styles.date}>{formatDate(item.completedAt)}</Text>
              </View>
              <Text style={styles.durationText}>
                {formatDuration(item.totalDurationMs)}
              </Text>

              {isExpanded && (
                <View style={styles.expandedSection}>
                  <Text style={styles.timeOfDay}>
                    Completed at {formatTimeOfDay(item.completedAt)}
                  </Text>

                  <View style={styles.expandedActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => router.push(`/workout/run/${item.workoutId}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionBtnIcon}>▶</Text>
                      <Text style={styles.actionBtnLabel}>Run Again</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSecondary]}
                      onPress={() => router.push(`/workout/${item.workoutId}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionBtnIconSecondary}>✎</Text>
                      <Text style={styles.actionBtnLabelSecondary}>Edit Workout</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
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
  cardExpanded: {
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
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
  expandedSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  timeOfDay: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  expandedActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionBtnIcon: {
    fontSize: 14,
    color: Colors.black,
  },
  actionBtnLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.surfaceLight,
  },
  actionBtnIconSecondary: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  actionBtnLabelSecondary: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
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
