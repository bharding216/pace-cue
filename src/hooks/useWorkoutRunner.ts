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
import { AppState, Platform } from 'react-native';
import {
  EngineState,
  WorkoutDefinition,
  AppSettings,
  CompletedWorkout,
  IntervalSplit,
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
import {
  playCue,
  configureAudio,
  speakIntervalProgress,
  speakPaceCue,
  startBackgroundLoop,
  stopBackgroundLoop,
  setVoiceIdentifier,
  setDuckingEnabled,
  type CueContext,
} from '../audio/audioManager';
import { usePaceTracker, type PaceTrackerResult } from './usePaceTracker';
import type { PaceState } from '../pace/paceTypes';
import {
  hapticIntervalChange,
  hapticWarning,
  hapticCountdown,
  hapticWorkoutComplete,
} from '../audio/haptics';
import { saveCompletedWorkout } from '../workout/workoutStorage';
import { onWorkoutCompleted } from '../review/storeReview';
import { track } from '../analytics/track';
import {
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
} from './useLiveActivity';

/** Build a verbose CueContext from the engine state for rich voice announcements. */
function buildVerboseCueContext(
  state: EngineState,
  cueType: 'intervalStart' | 'warning',
  settings?: AppSettings,
): CueContext {
  const ci = currentInterval(state);
  const ni = nextInterval(state);
  if (!ci) return {};
  return {
    currentLabel: ci.label,
    currentDuration: ci.durationSeconds,
    effort: ci.effort,
    blockName: ci.blockName,
    blockNumber: ci.blockNumber,
    setNumber: ci.setNumber,
    totalSets: ci.totalSets,
    isFirstInBlock: ci.isFirstInBlock,
    isFirstInSet: ci.isFirstInSet,
    blockSummary: ci.blockSummary,
    blockIntervalCount: ci.blockIntervalCount,
    nextLabel: ni?.label,
    nextDuration: ni?.durationSeconds,
    nextEffort: ni?.effort,
    warningSeconds:
      cueType === 'warning' ? remainingSeconds(state) : undefined,
    targetPace: ci.targetPace,
    paceUnit: settings?.paceUnit,
  };
}

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

  // Pace tracking
  paceState: PaceState;
  isPaceTracking: boolean;

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

  // Pace tracking
  const paceTracker = usePaceTracker(
    settings.paceTrackingEnabled,
    settings.paceWindow,
  );
  const paceTrackerRef = useRef(paceTracker);
  paceTrackerRef.current = paceTracker;

  // Refs for the animation loop so we have access to latest state
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Track which warnings we've already fired to avoid duplicates
  const firedWarnings = useRef(new Set<number>());
  const firedCountdowns = useRef(new Set<number>());
  const firedTimeAnnouncements = useRef(new Set<number>());
  const firedPaceCues = useRef(new Set<number>());
  const lastIndex = useRef(-1);

  // Force re-render while running so the timer updates smoothly
  const [, setTick] = useState(0);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prevent saving history more than once per workout
  const historySaved = useRef(false);

  // ── Per-interval split tracking ──────────────────────────────────
  const splitsRef = useRef<IntervalSplit[]>([]);
  const intervalStartedAtRef = useRef(0); // epoch ms when current interval began
  const intervalStartDistanceRef = useRef(0); // distance (m) at interval start

  /** Snapshot the current interval's performance into a split record. */
  const captureSplit = useCallback((s: EngineState) => {
    const ci = currentInterval(s);
    if (!ci) return;
    const now = Date.now();
    const actualMs = intervalStartedAtRef.current > 0
      ? now - intervalStartedAtRef.current
      : ci.durationSeconds * 1000;

    const ps = paceTrackerRef.current.paceState;
    const distNow = ps.totalDistanceMeters;
    const intervalDist = distNow - intervalStartDistanceRef.current;
    const hasDist = settingsRef.current.paceTrackingEnabled && intervalDist > 1;

    const actualSec = actualMs / 1000;
    const mps = hasDist ? intervalDist / actualSec : null;
    const METERS_PER_MILE = 1609.344;
    const METERS_PER_KM = 1000;

    splitsRef.current.push({
      label: ci.label,
      type: ci.type,
      plannedDurationSec: ci.durationSeconds,
      actualDurationMs: actualMs,
      distanceMeters: hasDist ? intervalDist : null,
      avgPaceMinPerMile: mps && mps > 0.3 ? METERS_PER_MILE / mps / 60 : null,
      avgPaceMinPerKm: mps && mps > 0.3 ? METERS_PER_KM / mps / 60 : null,
      targetPace: ci.targetPace,
      effort: ci.effort,
    });
  }, []);

  /** Mark the start of a new interval for split tracking. */
  const markIntervalStart = useCallback(() => {
    intervalStartedAtRef.current = Date.now();
    intervalStartDistanceRef.current = paceTrackerRef.current.paceState.totalDistanceMeters;
  }, []);

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
    let s = engineRef.current;

    if (s.phase === 'running') {
      // Advance through ALL expired intervals in one pass.
      // When the app is backgrounded the JS timer can be delayed by seconds
      // (or longer), so multiple intervals may have elapsed.
      if (isIntervalExpired(s)) {
        // Capture split for the interval that just ended
        captureSplit(s);

        let next = advanceInterval(s);
        while (next.phase === 'running' && isIntervalExpired(next)) {
          // Capture split for each skipped-over interval (backgrounded catch-up)
          captureSplit(next);
          next = advanceInterval(next);
        }
        engineRef.current = next;
        setEngine(next);

        if (next.phase === 'finished') {
          // Workout complete
          playCue('workoutComplete', settingsRef.current.audioCueMode, {});
          if (settingsRef.current.hapticEnabled) hapticWorkoutComplete();
          stopBackgroundLoop();
          endLiveActivity();
          paceTrackerRef.current.stop();

          // Save to history (guard against duplicate saves)
          if (!historySaved.current) {
            historySaved.current = true;
            const ps = paceTrackerRef.current.paceState;
            const entry: CompletedWorkout = {
              id: generateId(),
              workoutId: workout.id,
              workoutName: workout.name,
              completedAt: Date.now(),
              totalDurationMs: next.totalElapsedMs,
              splits: [...splitsRef.current],
              totalDistanceMeters: ps.totalDistanceMeters > 0 ? ps.totalDistanceMeters : undefined,
            };
            saveCompletedWorkout(entry).catch((e) =>
              console.warn('Failed to save workout history:', e)
            );
            onWorkoutCompleted();
            track('workout_completed', {
              workout_id: workout.id,
              workout_name: workout.name,
              total_duration_ms: next.totalElapsedMs,
            });
          }
        } else {
          // New interval started — voice cue for the current interval only
          markIntervalStart();
          const cueCtx = buildVerboseCueContext(next, 'intervalStart', settingsRef.current);
          playCue('intervalStart', settingsRef.current.audioCueMode, cueCtx);
          if (settingsRef.current.hapticEnabled) hapticIntervalChange();
          firedWarnings.current.clear();
          firedCountdowns.current.clear();
          firedTimeAnnouncements.current.clear();
          firedPaceCues.current.clear();

          updateLiveActivity(buildLAProps(next, false));
          lastLAUpdate.current = Date.now();
          lastLAIndex.current = next.currentIndex;
        }
      } else {
        // Check for interval-progress announcements, warning, and countdown cues
        const secs = remainingSeconds(s);
        const ci = currentInterval(s);
        const warnSecsArr = settingsRef.current.countdownWarningSeconds;
        const maxWarn = Math.max(...warnSecsArr);
        const announceEvery = settingsRef.current.timeRemainingInterval;

        // Announce elapsed time at regular intervals (voice only, no beep)
        if (
          announceEvery > 0 &&
          ci &&
          secs > maxWarn
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

        // Pace cue announcements at configured frequency
        const paceFreq = settingsRef.current.paceCueFrequency;
        if (
          settingsRef.current.paceTrackingEnabled &&
          paceFreq > 0 &&
          ci &&
          secs > maxWarn
        ) {
          const elapsed = ci.durationSeconds - secs;
          if (
            elapsed > 0 &&
            elapsed % paceFreq === 0 &&
            !firedPaceCues.current.has(elapsed)
          ) {
            firedPaceCues.current.add(elapsed);
            const ps = paceTrackerRef.current.paceState;
            const currentPace =
              settingsRef.current.paceUnit === 'minPerMile'
                ? ps.currentPaceMinPerMile
                : ps.currentPaceMinPerKm;
            speakPaceCue(
              currentPace,
              ci.targetPace,
              settingsRef.current.paceUnit,
              settingsRef.current.audioCueMode,
            );
          }
        }

        // Fire warning cues at each selected countdown threshold
        const newlyTriggered = warnSecsArr.filter(
          (w) => secs <= w && secs > 3 && !firedWarnings.current.has(w),
        );
        if (newlyTriggered.length > 0) {
          newlyTriggered.forEach((w) => firedWarnings.current.add(w));
          // Announce the most relevant (closest to now) warning
          const closest = Math.min(...newlyTriggered);
          const warnCtx = buildVerboseCueContext(s, 'warning', settingsRef.current);
          warnCtx.warningSeconds = closest;
          playCue('warning', settingsRef.current.audioCueMode, warnCtx);
          if (settingsRef.current.hapticEnabled) hapticWarning();
        }

        // 3-2-1 countdown beeps
        if (secs <= 3 && secs >= 1 && !firedCountdowns.current.has(secs)) {
          firedCountdowns.current.add(secs);
          playCue('countdown', settingsRef.current.audioCueMode);
          if (settingsRef.current.hapticEnabled) hapticCountdown();
        }

        // Periodic Live Activity refresh
        const now = Date.now();
        if (now - lastLAUpdate.current >= 10000) {
          updateLiveActivity(buildLAProps(s, false));
          lastLAUpdate.current = now;
        }
      }

      setTick((t) => t + 1);
    }
  }, [workout.id, workout.name, buildLAProps, captureSplit, markIntervalStart]);

  // Start/stop the tick loop based on engine phase.
  // Uses setInterval instead of requestAnimationFrame so ticks continue
  // when the app is backgrounded or the screen is locked.
  useEffect(() => {
    if (engine.phase === 'running') {
      intervalId.current = setInterval(tick, 200);
    }
    return () => {
      if (intervalId.current !== null) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [engine.phase, tick]);

  // When the app returns to foreground, immediately run a tick so the
  // Live Activity and UI catch up with any intervals that elapsed while
  // the JS timer was throttled in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && engineRef.current.phase === 'running') {
        tick();
      }
    });
    return () => sub.remove();
  }, [tick]);

  // Ensure audio is configured and voice is set
  useEffect(() => {
    configureAudio();
    setDuckingEnabled(settings.duckOtherAudio);
    setVoiceIdentifier(settings.voiceIdentifier);
  }, [settings.voiceIdentifier, settings.duckOtherAudio]);

  // Clean up Live Activity and background loop on unmount
  useEffect(() => {
    return () => {
      stopBackgroundLoop();
      endLiveActivity();
    };
  }, []);

  // Controls
  const start = useCallback(() => {
    const next = startWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    historySaved.current = false;
    splitsRef.current = [];
    firedWarnings.current.clear();
    firedCountdowns.current.clear();
    firedTimeAnnouncements.current.clear();
    firedPaceCues.current.clear();
    lastIndex.current = 0;
    const startCueCtx = buildVerboseCueContext(next, 'intervalStart', settingsRef.current);
    playCue('intervalStart', settingsRef.current.audioCueMode, startCueCtx);
    if (settingsRef.current.hapticEnabled) hapticIntervalChange();

    // Start pace tracking if enabled
    if (settingsRef.current.paceTrackingEnabled) {
      paceTrackerRef.current.reset();
      paceTrackerRef.current.start();
    }

    // Mark first interval start for split tracking
    markIntervalStart();

    // Start silent background loop and Live Activity
    startBackgroundLoop();
    startLiveActivity(buildLAProps(next, false), workout.id);
    lastLAUpdate.current = Date.now();
    lastLAIndex.current = 0;

    track('workout_started', {
      workout_id: workout.id,
      workout_name: workout.name,
      interval_count: next.intervals.length,
      total_duration_seconds: next.intervals.reduce((s, i) => s + i.durationSeconds, 0),
    });
  }, [buildLAProps, markIntervalStart]);

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
    // Capture split for the interval being skipped
    captureSplit(engineRef.current);

    const next = skipInterval(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    if (next.phase !== 'finished') {
      firedWarnings.current.clear();
      firedCountdowns.current.clear();
      firedTimeAnnouncements.current.clear();
      firedPaceCues.current.clear();
      markIntervalStart();
      const skipCueCtx = buildVerboseCueContext(next, 'intervalStart', settingsRef.current);
      playCue('intervalStart', settingsRef.current.audioCueMode, skipCueCtx);
      if (settingsRef.current.hapticEnabled) hapticIntervalChange();

      // Update Live Activity immediately on skip
      updateLiveActivity(buildLAProps(next, false));
      lastLAUpdate.current = Date.now();
      lastLAIndex.current = next.currentIndex;
    } else {
      playCue('workoutComplete', settingsRef.current.audioCueMode, {});
      if (settingsRef.current.hapticEnabled) hapticWorkoutComplete();
      stopBackgroundLoop();
      endLiveActivity();
      paceTrackerRef.current.stop();
      if (!historySaved.current) {
        historySaved.current = true;
        const ps = paceTrackerRef.current.paceState;
        const entry: CompletedWorkout = {
          id: generateId(),
          workoutId: workout.id,
          workoutName: workout.name,
          completedAt: Date.now(),
          totalDurationMs: next.totalElapsedMs,
          splits: [...splitsRef.current],
          totalDistanceMeters: ps.totalDistanceMeters > 0 ? ps.totalDistanceMeters : undefined,
        };
        saveCompletedWorkout(entry).catch((e) =>
          console.warn('Failed to save workout history:', e)
        );
        onWorkoutCompleted();
        track('workout_completed', {
          workout_id: workout.id,
          workout_name: workout.name,
          total_duration_ms: next.totalElapsedMs,
        });
      }
    }
  }, [workout.id, workout.name, buildLAProps, captureSplit, markIntervalStart]);

  const stop_ = useCallback(() => {
    // Capture split for the interval in progress when stopped
    captureSplit(engineRef.current);

    const next = stopWorkout(engineRef.current);
    engineRef.current = next;
    setEngine(next);
    stopBackgroundLoop();
    endLiveActivity();
    paceTrackerRef.current.stop();

    // Save partial workout to history
    if (next.totalElapsedMs > 0 && !historySaved.current) {
      historySaved.current = true;
      const ps = paceTrackerRef.current.paceState;
      const entry: CompletedWorkout = {
        id: generateId(),
        workoutId: workout.id,
        workoutName: workout.name,
        completedAt: Date.now(),
        totalDurationMs: next.totalElapsedMs,
        splits: [...splitsRef.current],
        totalDistanceMeters: ps.totalDistanceMeters > 0 ? ps.totalDistanceMeters : undefined,
      };
      saveCompletedWorkout(entry).catch((e) =>
        console.warn('Failed to save workout history:', e)
      );

      // Still prompt for review if the user completed a good chunk of the
      // workout (e.g. skipped the cooldown). 50% threshold avoids prompting
      // on genuinely abandoned workouts.
      const plannedMs =
        next.intervals.reduce((s, i) => s + i.durationSeconds, 0) * 1000;
      if (plannedMs > 0 && next.totalElapsedMs / plannedMs >= 0.5) {
        onWorkoutCompleted();
      }

      track('workout_abandoned', {
        workout_id: workout.id,
        workout_name: workout.name,
        elapsed_ms: next.totalElapsedMs,
        completion_pct: plannedMs > 0
          ? Math.round((next.totalElapsedMs / plannedMs) * 100)
          : 0,
      });
    }
  }, [workout.id, workout.name, captureSplit]);

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

    // Pace tracking
    paceState: paceTracker.paceState,
    isPaceTracking: paceTracker.isTracking,

    start,
    pause,
    resume: resume_,
    skip: skip_,
    stop: stop_,
  };
}
