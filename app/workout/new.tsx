/**
 * Create a new workout.
 *
 * When navigated with ?addToDate=YYYY-MM-DD the newly created workout
 * is also added to the user's training calendar on that date.
 */

import React from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { WorkoutDefinition, generateId, flattenWorkout, createSegment, createRepeatGroup } from '../../src/workout/workoutTypes';
import { saveWorkout } from '../../src/workout/workoutStorage';
import { WorkoutEditorForm } from '../../src/components/WorkoutEditorForm';
import { addWorkoutToCalendar } from '../../src/ai/planService';
import { useTrainingPlan } from '../../src/contexts/TrainingPlanContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { track } from '../../src/analytics/track';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const { addToDate } = useLocalSearchParams<{ addToDate?: string }>();
  const { ensurePlan } = useTrainingPlan();
  const { user } = useAuth();
  const now = Date.now();

  const blank: WorkoutDefinition = {
    id: generateId(),
    name: '',
    blocks: [
      createSegment('warmup', { target: { type: 'time', durationSeconds: 300 } }),
      createRepeatGroup(4, {
        blocks: [
          createSegment('run', { intensity: 'hard', target: { type: 'time', durationSeconds: 180 } }),
          createSegment('recovery', { target: { type: 'time', durationSeconds: 120 } }),
        ],
      }),
      createSegment('cooldown', { target: { type: 'time', durationSeconds: 300 } }),
    ],
    createdAt: now,
    updatedAt: now,
  };

  return (
    <>
      {addToDate && (
        <Stack.Screen options={{ title: 'New Workout for Plan' }} />
      )}
      <WorkoutEditorForm
        initial={blank}
        onSave={async (workout) => {
          await saveWorkout(workout);
          track('workout_created', {
            workout_id: workout.id,
            workout_name: workout.name,
            interval_count: flattenWorkout(workout).length,
          });

          if (addToDate && user) {
            const activePlan = await ensurePlan();
            await addWorkoutToCalendar(
              activePlan.id,
              user.id,
              addToDate,
              workout,
              activePlan.start_date,
            );
            track('workout_added_to_plan', {
              workout_id: workout.id,
              date: addToDate,
            });
          }

          router.back();
        }}
        onCancel={() => router.back()}
      />
    </>
  );
}
