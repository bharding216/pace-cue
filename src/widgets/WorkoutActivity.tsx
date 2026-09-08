/**
 * iOS Live Activity for PaceCue.
 *
 * Shows the current interval, countdown timer, and next interval on the
 * Lock Screen and Dynamic Island while a workout is running.
 *
 * Uses expo-widgets + @expo/ui/swift-ui — no native Swift code needed.
 */

import { Text, VStack, HStack, Spacer, Image } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
  monospacedDigit,
  frame,
  activityBackgroundTint,
} from '@expo/ui/swift-ui/modifiers';
import {
  createLiveActivity,
  type LiveActivityEnvironment,
} from 'expo-widgets';

export type WorkoutActivityProps = {
  intervalLabel: string;
  intervalType: 'warmup' | 'hard' | 'easy' | 'cooldown';
  /** Epoch-ms timestamp when the current interval ends (for live countdown). */
  intervalEndsAt: number;
  /** Epoch-ms timestamp when the current interval started. */
  intervalStartedAt: number;
  nextLabel: string;
  intervalNumber: string; // e.g. "3 / 12"
  workoutName: string;
  isPaused: boolean;
  /** If paused, the remaining ms frozen at pause time. */
  pausedRemainingMs: number;
};

const WorkoutActivity = (
  props: WorkoutActivityProps,
  environment: LiveActivityEnvironment
) => {
  'widget';

  const color =
    props.intervalType === 'hard'
      ? '#F87171'
      : props.intervalType === 'easy'
        ? '#4ADE80'
        : props.intervalType === 'warmup'
          ? '#FBBF24'
          : props.intervalType === 'cooldown'
            ? '#60A5FA'
            : '#94A3B8';

  const icon =
    props.intervalType === 'hard'
      ? 'flame.fill'
      : props.intervalType === 'easy'
        ? 'leaf.fill'
        : props.intervalType === 'warmup'
          ? 'sun.max.fill'
          : 'wind';

  // Build the timer interval for SwiftUI's auto-updating Text.
  // When paused, we show a frozen time by setting pauseTime.
  const now = new Date();
  const endsAt = new Date(props.intervalEndsAt);
  const startedAt = new Date(props.intervalStartedAt);

  // For the paused state, we set pauseTime to "now" so the timer freezes.
  const pauseTime = props.isPaused ? now : undefined;

  return {
    // ── Lock Screen Banner ──────────────────────────────────────────
    banner: (
      <HStack modifiers={[padding({ all: 16 }), activityBackgroundTint('#0A0A0F')]}>
        <VStack>
          <Text
            modifiers={[
              font({ weight: 'bold', size: 18 }),
              foregroundStyle(color),
            ]}
          >
            {props.intervalLabel.toUpperCase()}
          </Text>
          {props.nextLabel ? (
            <Text
              modifiers={[
                font({ size: 13 }),
                foregroundStyle('#94A3B8'),
              ]}
            >
              Up next: {props.nextLabel}
            </Text>
          ) : null}
        </VStack>
        <Spacer />
        <VStack>
          <Text
            timerInterval={{ lower: startedAt, upper: endsAt }}
            countsDown={true}
            pauseTime={pauseTime}
            modifiers={[
              font({ weight: 'bold', size: 32, design: 'monospaced' }),
              monospacedDigit(),
              foregroundStyle(color),
            ]}
          />
          <Text
            modifiers={[
              font({ size: 11 }),
              foregroundStyle('#475569'),
            ]}
          >
            {props.intervalNumber}
          </Text>
        </VStack>
      </HStack>
    ),

    // ── Dynamic Island: Compact Leading ─────────────────────────────
    compactLeading: (
      <HStack>
        <Image systemName={icon} color={color} size={12} />
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 12 }),
            foregroundStyle(color),
          ]}
        >
          {' '}{props.intervalLabel}
        </Text>
      </HStack>
    ),

    // ── Dynamic Island: Compact Trailing ────────────────────────────
    compactTrailing: (
      <Text
        timerInterval={{ lower: startedAt, upper: endsAt }}
        countsDown={true}
        pauseTime={pauseTime}
        modifiers={[
          font({ weight: 'bold', size: 12, design: 'monospaced' }),
          monospacedDigit(),
          foregroundStyle(color),
        ]}
      />
    ),

    // ── Dynamic Island: Minimal ─────────────────────────────────────
    minimal: (
      <Image systemName={icon} color={color} size={14} />
    ),

    // ── Dynamic Island: Expanded Leading ────────────────────────────
    expandedLeading: (
      <VStack modifiers={[padding({ leading: 4 })]}>
        <Image systemName={icon} color={color} size={24} />
        <Text
          modifiers={[
            font({ weight: 'bold', size: 14 }),
            foregroundStyle(color),
          ]}
        >
          {props.intervalLabel}
        </Text>
      </VStack>
    ),

    // ── Dynamic Island: Expanded Trailing ───────────────────────────
    expandedTrailing: (
      <VStack modifiers={[padding({ trailing: 4 })]}>
        <Text
          timerInterval={{ lower: startedAt, upper: endsAt }}
          countsDown={true}
          pauseTime={pauseTime}
          modifiers={[
            font({ weight: 'bold', size: 28, design: 'monospaced' }),
            monospacedDigit(),
            foregroundStyle(color),
          ]}
        />
        <Text
          modifiers={[
            font({ size: 11 }),
            foregroundStyle('#94A3B8'),
          ]}
        >
          {props.intervalNumber}
        </Text>
      </VStack>
    ),

    // ── Dynamic Island: Expanded Bottom ─────────────────────────────
    expandedBottom: (
      <HStack modifiers={[padding({ horizontal: 4 })]}>
        <Text
          modifiers={[
            font({ size: 13 }),
            foregroundStyle('#94A3B8'),
          ]}
        >
          {props.workoutName}
        </Text>
        <Spacer />
        {props.nextLabel ? (
          <Text
            modifiers={[
              font({ size: 13 }),
              foregroundStyle('#475569'),
            ]}
          >
            Next: {props.nextLabel}
          </Text>
        ) : null}
      </HStack>
    ),
  };
};

export default createLiveActivity('WorkoutActivity', WorkoutActivity);
