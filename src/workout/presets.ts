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
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 180, label: 'Hard' },
            { type: 'easy', durationSeconds: 120, label: 'Easy' },
          ],
          repeatCount: 6,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Tempo Run',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 480 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 60, label: 'Easy Jog' },
          ],
          repeatCount: 3,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 1200, label: 'Tempo' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Short Intervals',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 300 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 90, label: 'Sprint' },
            { type: 'easy', durationSeconds: 90, label: 'Recover' },
          ],
          repeatCount: 8,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Pyramid',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
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
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Easy 30 Min',
      warmup: [],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 1800, label: 'Easy Run' },
          ],
          repeatCount: 1,
        },
      ],
      cooldown: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Fartlek',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 120, label: 'Speed' },
            { type: 'easy', durationSeconds: 60, label: 'Jog' },
          ],
          repeatCount: 3,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 60, label: 'Sprint' },
            { type: 'easy', durationSeconds: 60, label: 'Jog' },
          ],
          repeatCount: 3,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 30, label: 'Sprint' },
            { type: 'easy', durationSeconds: 30, label: 'Float' },
          ],
          repeatCount: 4,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Hill Repeats',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 60, label: 'Hill' },
            { type: 'easy', durationSeconds: 90, label: 'Jog' },
          ],
          repeatCount: 8,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Mile Intervals',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 60, label: 'Easy Jog' },
          ],
          repeatCount: 3,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 360, label: 'Race Pace' },
            { type: 'easy', durationSeconds: 120, label: 'Recovery' },
          ],
          repeatCount: 4,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '400m Repeats',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 600 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 40, label: 'Easy Jog' },
          ],
          repeatCount: 4,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 90, label: 'Sprint' },
            { type: 'easy', durationSeconds: 90, label: 'Recovery' },
          ],
          repeatCount: 10,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Run/Walk',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 180, label: 'Walk' }], repeatCount: 1 },
      ],
      blocks: [
        {
          intervals: [
            { type: 'easy', durationSeconds: 180, label: 'Run' },
            { type: 'easy', durationSeconds: 60, label: 'Walk' },
          ],
          repeatCount: 8,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 120, label: 'Walk' }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '5K Training',
      warmup: [
        { intervals: [{ type: 'warmup', durationSeconds: 480 }], repeatCount: 1 },
        {
          intervals: [
            { type: 'hard', durationSeconds: 20, label: 'Stride' },
            { type: 'easy', durationSeconds: 60, label: 'Easy Jog' },
          ],
          repeatCount: 3,
        },
      ],
      blocks: [
        {
          intervals: [
            { type: 'hard', durationSeconds: 300, label: 'Tempo' },
            { type: 'easy', durationSeconds: 120, label: 'Recovery' },
          ],
          repeatCount: 3,
        },
        {
          intervals: [
            { type: 'hard', durationSeconds: 60, label: 'Speed' },
            { type: 'easy', durationSeconds: 60, label: 'Jog' },
          ],
          repeatCount: 3,
        },
      ],
      cooldown: [
        { intervals: [{ type: 'cooldown', durationSeconds: 300 }], repeatCount: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}
