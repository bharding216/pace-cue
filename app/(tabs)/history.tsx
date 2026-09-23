/**
 * History screen — shows completed workouts.
 */

import React, { useCallback, useRef, useState } from 'react';
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
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { CompletedWorkout, formatTime } from '../../src/workout/workoutTypes';
import { loadHistory, clearHistory, deleteHistoryEntry } from '../../src/workout/workoutStorage';
import { exportData, importData } from '../../src/workout/backupManager';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function DeleteAction({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.deleteAction}
    >
      <Ionicons name="trash-outline" size={24} color={Colors.white} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const swipeableRefs = useRef<Map<string, SwipeableMethods>>(new Map());

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

  const handleDelete = (item: CompletedWorkout) => {
    Alert.alert(
      'Delete Workout',
      `Remove "${item.workoutName}" from your history?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRefs.current.get(item.id)?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            const updated = await deleteHistoryEntry(item.id);
            setHistory(updated);
          },
        },
      ],
      { cancelable: true, onDismiss: () => swipeableRefs.current.get(item.id)?.close() },
    );
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
            {/* Backup / Restore row */}
            <View style={styles.backupSection}>
              <Text style={styles.backupHint}>
                Save a backup before deleting the app so you don't lose your data.
              </Text>
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
                    <Ionicons name="cloud-upload-outline" size={18} color={Colors.textPrimary} />
                  )}
                  <Text style={styles.backupBtnLabel}>Back Up Data</Text>
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
                    <Ionicons name="cloud-download-outline" size={18} color={Colors.textPrimary} />
                  )}
                  <Text style={styles.backupBtnLabel}>Restore Backup</Text>
                </TouchableOpacity>
              </View>
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
            <ReanimatedSwipeable
              ref={(ref) => {
                if (ref) swipeableRefs.current.set(item.id, ref);
                else swipeableRefs.current.delete(item.id);
              }}
              friction={2}
              rightThreshold={40}
              renderRightActions={() => (
                <DeleteAction onPress={() => handleDelete(item)} />
              )}
              overshootRight={false}
              containerStyle={styles.swipeableContainer}
            >
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
                        <Ionicons name="play" size={14} color={Colors.black} />
                        <Text style={styles.actionBtnLabel}>Run Again</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnSecondary]}
                        onPress={() => router.push(`/workout/${item.workoutId}`)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={14} color={Colors.textPrimary} />
                        <Text style={styles.actionBtnLabelSecondary}>Edit Workout</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </ReanimatedSwipeable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.textMuted} />
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
  backupSection: {
    marginBottom: Spacing.md,
  },
  backupHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  backupRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  swipeableContainer: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  deleteAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.danger,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
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
  actionBtnLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.surfaceLight,
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
