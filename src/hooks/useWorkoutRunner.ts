/**
 * React hook that drives the workout engine and triggers audio/haptic cues.
 *
 * This is the bridge between the pure functional engine and the React UI.
 * It runs a high-frequency requestAnimationFrame loop while the workout is
 * active and fires cues at the right moments.
 *
 * On iOS, it also manages a Live Activity on the Lock Screen / Dynamic Island.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  EngineState,
  WorkoutDefinition,
  AppSettings,
  CompletedWorkout,
  generateId,
  IntervalType,
} from '../workout/workoutTypes';
import {
  createEngineState,
  startWorkout,
  pauseWorkout,
  resumeWorkout,
  skipInterval,
  advanceInterval,
  stopWorkout,
  currentInterval,
  remainingSeconds,
  remainingMs,
  intervalProgress,
  isIntervalExpired,
  totalRemainingSeconds,
  nextInterval,
} from '../workout/workoutEngine';
import { playCue, configureAudio, speakIntervalProgress, type CueContext } from '../audio/audioManager';
import {
  hapticIntervalChange,
  hapticWarning,
  hapticCountdown,
  hapticWorkoutComplete,
} from '../audio/haptics';
import { saveCompletedWorkout } from '../workout/workoutStorage';
import {
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
} from './useLiveActivity';

export interface WorkoutRunnerControls {
  state: EngineState;
  remaining: number; // seconds
  remainingMillis: number;
  progress: number; // 0..1
  totalRemaining: number; // seconds
  currentLabel: string;
  currentType: string;
  nextLabel: string | null;
  intervalNumber: string; // e.g. "3 / 12"

  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
}

export function useWorkoutRunner(
  workout: WorkoutDefinition,
  settings: AppSettings
): WorkoutRunnerControls {
  const [engine, setEngine] = useState<EngineState>(() =>
    createEngineState(workout)
  );

  // Refs for the animation loop so we have access to latest state
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Track which warnings we've already fired to avoid duplicates
  const firedWarning = useRef(false);
  const firedCountdowns = useRef(new Set<number>());
  const firedTimeAnnouncements = useRef(new Set<number>());
  const lastIndex = useRef(-1);

  // Force re-render at ~15fps while running so the timer updates smoothly
  const [, setTick] = useState(0);
  const rafId = useRef<number | null>(null);

  // Prevent saving history more than once per workout
  const historySaved = useRef(false);

  // Live Activity: throttle updates to ~1/sec to stay within the system budget
  const lastLAUpdate = useRef(0);
  const lastLAIndex = useRef(-1);

  /** Build Live Activity props from the current engine state. */
  const buildLAProps = useCallback(
    (s: EngineState, isPaused: boolean) => {
      const ci = currentInterval(s);
      const ni = nextInterval(s);
      const intervalNum =
        s.intervals.length > 0
          ? `${s.currentIndex + 1} / ${s.intervals.length}`
          : '';
      const durationMs = ci ? ci.durationSeconds * 1000 : 0;
      return {
        intervalLabel: ci?.label || '',
        intervalType: (ci?.type || 'easy') as IntervalType,
        intervalEndsAt: s.intervalEndsAt,
        intervalStartedAt: s.intervalEndsAt - durationMs,
        nextLabel: ni?.label || '',
        intervalNumber: intervalNum,
        workoutName: workout.name,
        isPaused,
        pausedRemainingMs: isPaused ? s.pausedRemaining : 0,
      };
    },
    [workout.name]
  );

  const tick = useCallback(() => {
    const s = engineRef.current;

    if (s.phase === 'running') {
      // Check if current interval has expired
      if (isIntervalExpired(s)) {
        const next = advanceInterval(s);
        engineRef.current = next;
        setEngine(next);

        if (next.phase === 'finished') {
          // Workout complete
          playCue('workoutComplete', settingsRef.current.audioCueMode, {});
          if (settingsRef.current.hapticEnabled) hapticWorkoutComplete();
          endLiveActivity();

          // Save to history (guard against duplicate saves)
          if (!historySaved.current) {
            historySaved.current = true;
            const entry: CompletedWorkout = {
              id: generateId(),
              workoutId: workout.id,
              workoutName: workout.name,
              completedAt: Date.now(),
              totalDurationMs: next.totalElapsedMs,
            };
            saveCompletedWorkout(entry).catch((e) =>
              console.warn('Failed to save workout history:', e)
            );
          }
        } else {
          // New interval started — update Live Activity immediately
          const newInterval = currentInterval(next);
          playCue('intervalStart', settingsRef.current.audioCueMode, {
            currentLabel: newInterval?.label,
          });
          if (settingsRef.current.hapticEnabled) hapticIntervalChange();
          firedWarning.current = false;
          firedCountdowns.current.clear();
          firedTimeAnnouncements.current.clear();

          updateLiveActivity(buildLAProps(next, false));
          lastLAUpdate.current = Date.now();
          lastLAIndex.current = next.currentIndex;
        }
      } else {
        // Check for interval-progress announcements, warning, and countdown cues
        const secs = remainingSeconds(s);
        const ci = currentInterval(s);
        const warnSecs = settingsRef.current.countdownWarningSeconds;
        const announceEvery = settingsRef.current.timeRemainingInterval;

        // Announce elapsed time at regular intervals (voice only, no beep)
        if (
          announceEvery > 0 &&
          ci &&
          secs > warnSecs
        ) {
          const elapsed = ci.durationSeconds - secs;
          if (
            elapsed > 0 &&
            elapsed % announceEvery === 0 &&
            !firedTimeAnnouncements.current.has(elapsed)
          ) {
            firedTimeAnnouncements.current.add(elapsed);
            speakIntervalProgress(elapsed, settingsRef.current.audioCueMode);
          }
        }

        if (secs <= warnSecs && secs > 3 && !firedWarning.current) {
          firedWarning.current = true;
          playCue('warning', settingsRef.current.audioCueMode, {
            currentLabel: ci?.label,
          });
          if (settingsRef.current.hapticEnabled) hapticWarning();
        }

        // 3-2-1 countdown beeps
        if (secs <= 3 && secs >= 1 && !firedCountdowns.current.has(secs)) {
          firedCountdowns.current.add(secs);
          playCue('countdown', settingsRef.current.audioCueMode);
          if (settingsRef.current.hapticEnabled) hapticCountdown();
        }
      }

      setTick((t) => t + 1);
    }

    // Only keep looping while running
    if (engineRef.current.phase === 'running') {
      rafId.current = requestAnimationFrame(tick);
    }
  }, [workout.id, workout.name, buildLAProps]);

  // Start/stop the animation loop based on engine phase
  useEffect(() => {
    if (engine.phase === 'running') {
      rafId.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [engine.phase, tick]);

  // Ensure audio is configured
  useEffect(() => {
    configureAudio();
  }, []);

  // Clean up Live Activity on unmount
  useEffect(() => {
    return () => {
      endLiveActivity();
    };
  }, []);

  // Controls
  const start = useCallback(() => {
    const next = startWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    historySaved.current = false;
    firedWarning.current = false;
    firedCountdowns.current.clear();
    firedTimeAnnouncements.current.clear();
    lastIndex.current = 0;
    const firstInterval = currentInterval(next);
    playCue('intervalStart', settingsRef.current.audioCueMode, {
      currentLabel: firstInterval?.label,
    });
    if (settingsRef.current.hapticEnabled) hapticIntervalChange();

    // Start Live Activity
    startLiveActivity(buildLAProps(next, false));
    lastLAUpdate.current = Date.now();
    lastLAIndex.current = 0;
  }, [buildLAProps]);

  const pause = useCallback(() => {
    const next = pauseWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);

    // Update Live Activity to show paused state
    updateLiveActivity(buildLAProps(next, true));
  }, [buildLAProps]);

  const resume_ = useCallback(() => {
    const next = resumeWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);

    // Update Live Activity with new timing
    updateLiveActivity(buildLAProps(next, false));
    lastLAUpdate.current = Date.now();
  }, [buildLAProps]);

  const skip_ = useCallback(() => {
    const next = skipInterval(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    if (next.phase !== 'finished') {
      firedWarning.current = false;
      firedCountdowns.current.clear();
      firedTimeAnnouncements.current.clear();
      const newInterval = currentInterval(next);
      playCue('intervalStart', settingsRef.current.audioCueMode, {
        currentLabel: newInterval?.label,
      });
      if (settingsRef.current.hapticEnabled) hapticIntervalChange();

      // Update Live Activity immediately on skip
      updateLiveActivity(buildLAProps(next, false));
      lastLAUpdate.current = Date.now();
      lastLAIndex.current = next.currentIndex;
    } else {
      playCue('workoutComplete', settingsRef.current.audioCueMode, {});
      if (settingsRef.current.hapticEnabled) hapticWorkoutComplete();
      endLiveActivity();
      if (!historySaved.current) {
        historySaved.current = true;
        const entry: CompletedWorkout = {
          id: generateId(),
          workoutId: workout.id,
          workoutName: workout.name,
          completedAt: Date.now(),
          totalDurationMs: next.totalElapsedMs,
        };
        saveCompletedWorkout(entry).catch((e) =>
          console.warn('Failed to save workout history:', e)
        );
      }
    }
  }, [workout.id, workout.name, buildLAProps]);

  const stop_ = useCallback(() => {
    const next = stopWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    endLiveActivity();

    // Save partial workout to history
    if (next.totalElapsedMs > 0 && !historySaved.current) {
      historySaved.current = true;
      const entry: CompletedWorkout = {
        id: generateId(),
        workoutId: workout.id,
        workoutName: workout.name,
        completedAt: Date.now(),
        totalDurationMs: next.totalElapsedMs,
      };
      saveCompletedWorkout(entry).catch((e) =>
        console.warn('Failed to save workout history:', e)
      );
    }
  }, [workout.id, workout.name]);

  // Derived display values
  const ci = currentInterval(engine);
  const ni = nextInterval(engine);

  return {
    state: engine,
    remaining: remainingSeconds(engine),
    remainingMillis: remainingMs(engine),
    progress: intervalProgress(engine),
    totalRemaining: totalRemainingSeconds(engine),
    currentLabel: ci?.label || '',
    currentType: ci?.type || 'easy',
    nextLabel: ni?.label || null,
    intervalNumber:
      engine.intervals.length > 0
        ? `${engine.currentIndex + 1} / ${engine.intervals.length}`
        : '',

    start,
    pause,
    resume: resume_,
    skip: skip_,
    stop: stop_,
  };
}
