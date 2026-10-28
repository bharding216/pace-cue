/**
 * iOS Live Activity for SplitCue.
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

  // Timer display: use `date` + `dateStyle="timer"` for the countdown.
  // This is simpler and more reliable in widget extensions than `timerInterval`
  // (which requires a ClosedRangeDate record that can fail to deserialize).
  // When paused, we render a static formatted string instead.
  const endsAt = new Date(props.intervalEndsAt);

  // Pre-format the paused remaining time as M:SS
  const pausedTotalSec = Math.ceil(props.pausedRemainingMs / 1000);
  const pausedMin = Math.floor(pausedTotalSec / 60);
  const pausedSec = pausedTotalSec % 60;
  const pausedText = pausedMin + ':' + (pausedSec < 10 ? '0' : '') + pausedSec;

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
          {props.isPaused ? (
            <Text
              modifiers={[
                font({ weight: 'bold', size: 32, design: 'monospaced' }),
                monospacedDigit(),
                foregroundStyle(color),
              ]}
            >
              {pausedText}
            </Text>
          ) : (
            <Text
              date={endsAt}
              dateStyle="timer"
              modifiers={[
                font({ weight: 'bold', size: 32, design: 'monospaced' }),
                monospacedDigit(),
                foregroundStyle(color),
              ]}
            />
          )}
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
    compactTrailing: props.isPaused ? (
      <Text
        modifiers={[
          font({ weight: 'bold', size: 12, design: 'monospaced' }),
          monospacedDigit(),
          foregroundStyle(color),
        ]}
      >
        {pausedText}
      </Text>
    ) : (
      <Text
        date={endsAt}
        dateStyle="timer"
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
        {props.isPaused ? (
          <Text
            modifiers={[
              font({ weight: 'bold', size: 28, design: 'monospaced' }),
              monospacedDigit(),
              foregroundStyle(color),
            ]}
          >
            {pausedText}
          </Text>
        ) : (
          <Text
            date={endsAt}
            dateStyle="timer"
            modifiers={[
              font({ weight: 'bold', size: 28, design: 'monospaced' }),
              monospacedDigit(),
              foregroundStyle(color),
            ]}
          />
        )}
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
