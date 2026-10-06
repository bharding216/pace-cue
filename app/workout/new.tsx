/**
 * Create a new workout.
 */

import React from 'react';
import { useRouter } from 'expo-router';
import { WorkoutDefinition, generateId, flattenWorkout } from '../../src/workout/workoutTypes';
import { saveWorkout } from '../../src/workout/workoutStorage';
import { WorkoutEditorForm } from '../../src/components/WorkoutEditorForm';
import { track } from '../../src/analytics/track';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const now = Date.now();

  const blank: WorkoutDefinition = {
    id: generateId(),
    name: '',
    warmup: [
      { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
    ],
    blocks: [
      {
        intervals: [
          { type: 'hard', durationSeconds: 180 },
          { type: 'easy', durationSeconds: 120 },
        ],
        repeatCount: 4,
      },
    ],
    cooldown: [
      { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
    ],
    createdAt: now,
    updatedAt: now,
  };

  return (
    <WorkoutEditorForm
      initial={blank}
      onSave={async (workout) => {
        await saveWorkout(workout);
        track('workout_created', {
          workout_id: workout.id,
          workout_name: workout.name,
          interval_count: flattenWorkout(workout).length,
        });
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
