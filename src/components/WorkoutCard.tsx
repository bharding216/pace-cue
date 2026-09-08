import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  WorkoutDefinition,
  totalWorkoutSeconds,
  formatTime,
  flattenWorkout,
} from '../workout/workoutTypes';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  intervalColor,
} from '../constants/theme';

interface WorkoutCardProps {
  workout: WorkoutDefinition;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function WorkoutCard({
  workout,
  onStart,
  onEdit,
  onDelete,
}: WorkoutCardProps) {
  const totalSecs = totalWorkoutSeconds(workout);
  const intervals = flattenWorkout(workout);

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      `Delete "${workout.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{workout.name}</Text>
        <Text style={styles.duration}>{formatTime(totalSecs)}</Text>
      </View>

      {/* Mini preview of interval structure */}
      <View style={styles.preview}>
        {intervals.slice(0, 20).map((int, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: intervalColor(int.type) },
            ]}
          />
        ))}
        {intervals.length > 20 && (
          <Text style={styles.moreText}>+{intervals.length - 20}</Text>
        )}
      </View>

      {/* Summary */}
      <Text style={styles.summary}>
        {intervals.length} interval{intervals.length !== 1 ? 's' : ''}
        {workout.blocks.length > 0 &&
          workout.blocks[0].repeatCount > 1 &&
          ` · ${workout.blocks[0].repeatCount}× repeat`}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStart}
          activeOpacity={0.7}
        >
          <Text style={styles.startText}>▶  START</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
            <Ionicons name="pencil-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  duration: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  preview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moreText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    alignSelf: 'center',
    marginLeft: 4,
  },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  startText: {
    color: Colors.black,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
  },
});
