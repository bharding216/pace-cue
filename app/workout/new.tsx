/**
 * Create a new workout.
 */

import React from 'react';
import { useRouter } from 'expo-router';
import { WorkoutDefinition, generateId } from '../../src/workout/workoutTypes';
import { saveWorkout } from '../../src/workout/workoutStorage';
import { WorkoutEditorForm } from '../../src/components/WorkoutEditorForm';

export default function NewWorkoutScreen() {
  const router = useRouter();
  const now = Date.now();

  const blank: WorkoutDefinition = {
    id: generateId(),
    name: '',
    warmup: { type: 'warmup', durationSeconds: 300 },
    blocks: [
      {
        intervals: [
          { type: 'hard', durationSeconds: 180 },
          { type: 'easy', durationSeconds: 120 },
        ],
        repeatCount: 4,
      },
    ],
    cooldown: { type: 'cooldown', durationSeconds: 300 },
    createdAt: now,
    updatedAt: now,
  };

  return (
    <WorkoutEditorForm
      initial={blank}
      onSave={async (workout) => {
        await saveWorkout(workout);
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
