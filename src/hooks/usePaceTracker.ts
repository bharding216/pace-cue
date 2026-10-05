/**
 * React hook that manages GPS location tracking and pace calculation.
 *
 * Uses expo-location foreground watcher while the app is active, and
 * background location updates via TaskManager when backgrounded.
 * The background task feeds samples through a global event emitter
 * so the hook can pick them up when the app returns to foreground.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  GpsSample,
  PaceState,
  PaceWindowSize,
  createPaceState,
} from '../pace/paceTypes';
import { addSample, resetPaceState } from '../pace/paceTracker';

const BACKGROUND_LOCATION_TASK = 'pace-cue-background-location';

// ── Global sample buffer for background task ─────────────────────────
// The TaskManager task runs outside React, so it pushes samples into
// this buffer. The hook drains the buffer on each tick / app resume.
let backgroundSampleBuffer: GpsSample[] = [];

/** Define the background location task at module scope (required by TaskManager). */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Background location error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    for (const loc of locations) {
      backgroundSampleBuffer.push({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp,
        accuracy: loc.coords.accuracy ?? 999,
        speed: loc.coords.speed,
      });
    }
  }
});

export interface PaceTrackerResult {
  paceState: PaceState;
  isTracking: boolean;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

export function usePaceTracker(
  enabled: boolean,
  windowSeconds: PaceWindowSize,
): PaceTrackerResult {
  const [paceState, setPaceState] = useState<PaceState>(createPaceState);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    'undetermined' | 'granted' | 'denied'
  >('undetermined');

  const paceStateRef = useRef(paceState);
  paceStateRef.current = paceState;
  const windowRef = useRef(windowSeconds);
  windowRef.current = windowSeconds;
  const foregroundSubRef = useRef<Location.LocationSubscription | null>(null);
  const trackingRef = useRef(false);

  /** Process a single location object into pace state. */
  const processSample = useCallback((sample: GpsSample) => {
    const next = addSample(paceStateRef.current, sample, windowRef.current);
    paceStateRef.current = next;
    setPaceState(next);
  }, []);

  /** Drain any background samples that accumulated while backgrounded. */
  const drainBackgroundBuffer = useCallback(() => {
    if (backgroundSampleBuffer.length === 0) return;
    const buffered = [...backgroundSampleBuffer];
    backgroundSampleBuffer = [];
    let state = paceStateRef.current;
    for (const sample of buffered) {
      state = addSample(state, sample, windowRef.current);
    }
    paceStateRef.current = state;
    setPaceState(state);
  }, []);

  /** Start GPS tracking. */
  const start = useCallback(async () => {
    if (trackingRef.current) return;

    // Request foreground permission first
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      setPermissionStatus('denied');
      return;
    }

    // Request background permission (iOS will prompt for "Always")
    const { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();
    // Background permission is optional — foreground still works
    if (bgStatus !== 'granted') {
      console.warn('Background location not granted — pace tracking will pause when backgrounded');
    }

    setPermissionStatus('granted');
    trackingRef.current = true;
    setIsTracking(true);
    backgroundSampleBuffer = [];

    // Start foreground watcher for real-time updates
    foregroundSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 3,
        timeInterval: 1000,
      },
      (loc) => {
        processSample({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy ?? 999,
          speed: loc.coords.speed,
        });
      },
    );

    // Start background location updates (survives backgrounding)
    if (bgStatus === 'granted') {
      try {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 2000,
          activityType: Location.ActivityType.Fitness,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'PaceCue',
            notificationBody: 'Tracking your running pace',
            notificationColor: '#4ADE80',
          },
        });
      } catch (e) {
        console.warn('Failed to start background location:', e);
      }
    }
  }, [processSample]);

  /** Stop GPS tracking. */
  const stop = useCallback(async () => {
    trackingRef.current = false;
    setIsTracking(false);

    if (foregroundSubRef.current) {
      foregroundSubRef.current.remove();
      foregroundSubRef.current = null;
    }

    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (e) {
      console.warn('Failed to stop background location:', e);
    }
  }, []);

  /** Reset pace state (e.g. new workout). */
  const reset = useCallback(() => {
    const fresh = resetPaceState();
    paceStateRef.current = fresh;
    setPaceState(fresh);
    backgroundSampleBuffer = [];
  }, []);

  // Drain background buffer when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && trackingRef.current) {
        drainBackgroundBuffer();
      }
    });
    return () => sub.remove();
  }, [drainBackgroundBuffer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
        foregroundSubRef.current = null;
      }
    };
  }, []);

  return {
    paceState,
    isTracking,
    permissionStatus,
    start,
    stop,
    reset,
  };
}
