/**
 * Default workout presets so the app isn't empty on first launch.
 */

import { WorkoutDefinition, generateId } from './workoutTypes';

export function createPresets(): WorkoutDefinition[] {
  const now = Date.now();

  return [
    {
      id: generateId(),
      name: '5K Speed',
      warmup: { type: 'warmup', durationSeconds: 600 },
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 180, label: 'Hard' },
            { type: 'easy', durationSeconds: 120, label: 'Easy' },
          ],
          repeatCount: 6,
        },
      ],
      cooldown: { type: 'cooldown', durationSeconds: 300 },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Tempo Run',
      warmup: { type: 'warmup', durationSeconds: 600 },
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 1200, label: 'Tempo' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: { type: 'cooldown', durationSeconds: 300 },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Short Intervals',
      warmup: { type: 'warmup', durationSeconds: 300 },
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 90, label: 'Sprint' },
            { type: 'easy', durationSeconds: 90, label: 'Recover' },
          ],
          repeatCount: 8,
        },
      ],
      cooldown: { type: 'cooldown', durationSeconds: 300 },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Pyramid',
      warmup: { type: 'warmup', durationSeconds: 600 },
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 60 },
            { type: 'easy', durationSeconds: 60 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 120 },
            { type: 'easy', durationSeconds: 120 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 180 },
            { type: 'easy', durationSeconds: 180 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 120 },
            { type: 'easy', durationSeconds: 120 },
          ],
          repeatCount: 1,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 60 },
            { type: 'easy', durationSeconds: 60 },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: { type: 'cooldown', durationSeconds: 300 },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Easy 30 Min',
      warmup: null,
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 1800, label: 'Easy Run' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
