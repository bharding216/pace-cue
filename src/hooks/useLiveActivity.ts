/**
 * Live Activity bridge for iOS.
 *
 * Wraps expo-widgets Live Activity start/update/end calls with
 * Platform.OS guards so Android doesn't crash.
 *
 * The SwiftUI `Text(timerInterval:)` in the widget handles the actual
 * countdown rendering — we only need to push new props when the interval
 * changes, the workout is paused/resumed, or the workout ends.
 */

import { Platform } from 'react-native';
import type { WorkoutActivityProps } from '../widgets/WorkoutActivity';

// Lazy-import the Live Activity factory only on iOS to avoid loading
// the native widget module on Android.
let WorkoutActivity: typeof import('../widgets/WorkoutActivity').default | null = null;
let liveActivityInstance: any = null;

function getFactory() {
  if (Platform.OS !== 'ios') return null;
  if (!WorkoutActivity) {
    try {
      // Dynamic require so the native module is only loaded on iOS
      WorkoutActivity = require('../widgets/WorkoutActivity').default;
    } catch (e) {
      console.warn('Live Activity not available:', e);
      return null;
    }
  }
  return WorkoutActivity;
}

/** Start a new Live Activity for the current workout. */
export function startLiveActivity(props: WorkoutActivityProps): void {
  const factory = getFactory();
  if (!factory) return;

  try {
    // End any lingering activity from a previous workout
    if (liveActivityInstance) {
      try {
        liveActivityInstance.end('immediate');
      } catch {}
      liveActivityInstance = null;
    }

    liveActivityInstance = factory.start(props, 'pacecue://workout');
  } catch (e) {
    console.warn('Failed to start Live Activity:', e);
  }
}

/** Update the running Live Activity with new props. */
export function updateLiveActivity(props: WorkoutActivityProps): void {
  if (!liveActivityInstance) return;

  try {
    liveActivityInstance.update(props);
  } catch (e) {
    console.warn('Failed to update Live Activity:', e);
  }
}

/** End the Live Activity (immediately removes from Lock Screen). */
export function endLiveActivity(): void {
  if (!liveActivityInstance) return;

  try {
    liveActivityInstance.end('immediate');
  } catch (e) {
    console.warn('Failed to end Live Activity:', e);
  }
  liveActivityInstance = null;
}
