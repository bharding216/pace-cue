/**
 * React hook that drives the workout engine and triggers audio/haptic cues.
 *
 * This is the bridge between the pure functional engine and the React UI.
 * It runs a high-frequency requestAnimationFrame loop while the workout is
 * active and fires cues at the right moments.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  EngineState,
  WorkoutDefinition,
  AppSettings,
  CompletedWorkout,
  generateId,
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
import { playCue, configureAudio } from '../audio/audioManager';
import {
  hapticIntervalChange,
  hapticWarning,
  hapticCountdown,
  hapticWorkoutComplete,
} from '../audio/haptics';
import { saveCompletedWorkout } from '../workout/workoutStorage';

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
  const lastIndex = useRef(-1);

  // Force re-render at ~15fps while running so the timer updates smoothly
  const [, setTick] = useState(0);
  const rafId = useRef<number | null>(null);

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
          playCue('workoutComplete', settingsRef.current.audioCueMode);
          if (settingsRef.current.hapticEnabled) hapticWorkoutComplete();

          // Save to history
          const entry: CompletedWorkout = {
            id: generateId(),
            workoutId: workout.id,
            workoutName: workout.name,
            completedAt: Date.now(),
            totalDurationMs: next.totalElapsedMs,
          };
          saveCompletedWorkout(entry);
        } else {
          // New interval started
          playCue('intervalStart', settingsRef.current.audioCueMode);
          if (settingsRef.current.hapticEnabled) hapticIntervalChange();
          firedWarning.current = false;
          firedCountdowns.current.clear();
        }
      } else {
        // Check for warning / countdown cues
        const secs = remainingSeconds(s);
        const warnSecs = settingsRef.current.countdownWarningSeconds;

        if (secs <= warnSecs && secs > 3 && !firedWarning.current) {
          firedWarning.current = true;
          playCue('warning', settingsRef.current.audioCueMode);
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

    rafId.current = requestAnimationFrame(tick);
  }, [workout.id, workout.name]);

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

  // Controls
  const start = useCallback(() => {
    const next = startWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    firedWarning.current = false;
    firedCountdowns.current.clear();
    lastIndex.current = 0;
    playCue('intervalStart', settingsRef.current.audioCueMode);
    if (settingsRef.current.hapticEnabled) hapticIntervalChange();
  }, []);

  const pause = useCallback(() => {
    const next = pauseWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
  }, []);

  const resume_ = useCallback(() => {
    const next = resumeWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
  }, []);

  const skip_ = useCallback(() => {
    const next = skipInterval(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    if (next.phase !== 'finished') {
      firedWarning.current = false;
      firedCountdowns.current.clear();
      playCue('intervalStart', settingsRef.current.audioCueMode);
      if (settingsRef.current.hapticEnabled) hapticIntervalChange();
    } else {
      playCue('workoutComplete', settingsRef.current.audioCueMode);
      if (settingsRef.current.hapticEnabled) hapticWorkoutComplete();
      const entry: CompletedWorkout = {
        id: generateId(),
        workoutId: workout.id,
        workoutName: workout.name,
        completedAt: Date.now(),
        totalDurationMs: next.totalElapsedMs,
      };
      saveCompletedWorkout(entry);
    }
  }, [workout.id, workout.name]);

  const stop_ = useCallback(() => {
    const next = stopWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
  }, []);

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
