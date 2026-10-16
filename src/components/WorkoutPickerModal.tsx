/**
 * WorkoutPickerModal — bottom sheet to pick a workout from the user's library
 * for adding to a specific calendar date.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  WorkoutDefinition,
  totalWorkoutSeconds,
  formatTime,
  flattenWorkout,
  categorizeWorkout,
} from '../workout/workoutTypes';
import { loadWorkouts } from '../workout/workoutStorage';
import { Colors, Spacing, FontSize, BorderRadius, intervalColor } from '../constants/theme';

interface WorkoutPickerModalProps {
  visible: boolean;
  date: string;
  onSelect: (workout: WorkoutDefinition) => void;
  onClose: () => void;
}

function categoryIcon(cat: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (cat) {
    case 'distance': return 'navigate';
    case 'timed': return 'timer-outline';
    case 'intervals': return 'repeat';
    default: return 'barbell-outline';
  }
}

function categoryColor(cat: string): string {
  switch (cat) {
    case 'distance': return Colors.accent;
    case 'timed': return Colors.primary;
    case 'intervals': return Colors.warning;
    default: return Colors.textSecondary;
  }
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function WorkoutPickerModal({
  visible,
  date,
  onSelect,
  onClose,
}: WorkoutPickerModalProps) {
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    loadWorkouts().then((data) => {
      setWorkouts(data);
      setLoading(false);
    });
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Add Workout</Text>
              <Text style={styles.headerDate}>{formatDateDisplay(date)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : workouts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Workouts</Text>
              <Text style={styles.emptyText}>
                Create some workouts on the Home tab first.
              </Text>
            </View>
          ) : (
            <FlatList
              data={workouts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const cat = categorizeWorkout(item);
                const flat = flattenWorkout(item);
                const totalSec = totalWorkoutSeconds(item);

                return (
                  <TouchableOpacity
                    style={styles.workoutRow}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.workoutIcon, { backgroundColor: categoryColor(cat) + '22' }]}>
                      <Ionicons name={categoryIcon(cat)} size={18} color={categoryColor(cat)} />
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={styles.workoutName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.workoutMeta}>
                        {formatTime(totalSec)} · {flat.length} interval{flat.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  workoutMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
