/**
 * Workout editor — edit an existing workout.
 * Shared component with the "new" screen via WorkoutEditorForm.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WorkoutDefinition } from '../../src/workout/workoutTypes';
import { loadWorkouts, saveWorkout } from '../../src/workout/workoutStorage';
import { WorkoutEditorForm } from '../../src/components/WorkoutEditorForm';
import { Colors } from '../../src/constants/theme';

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDefinition | null>(null);

  useEffect(() => {
    loadWorkouts().then((all) => {
      const found = all.find((w) => w.id === id);
      if (found) setWorkout(found);
    });
  }, [id]);

  if (!workout) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <WorkoutEditorForm
      initial={workout}
      onSave={async (updated) => {
        await saveWorkout({ ...updated, updatedAt: Date.now() });
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
