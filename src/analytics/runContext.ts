/**
 * GPS quality summary attached to workout analytics events.
 */

import type { GpsSample } from '../pace/paceTypes';

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return Math.round(sorted[index] * 10) / 10;
}

/**
 * Accuracy stats for the kept GPS track. Samples worse than
 * MAX_ACCURACY_METERS are already dropped from the track, so a low
 * sample count is the signal for poor reception.
 */
export function gpsQuality(track: GpsSample[]): Record<string, number | null> {
  if (track.length === 0) {
    return { gps_sample_count: 0, gps_accuracy_median_m: null, gps_accuracy_p90_m: null };
  }
  const sorted = track.map((s) => s.accuracy).sort((a, b) => a - b);
  return {
    gps_sample_count: track.length,
    gps_accuracy_median_m: percentile(sorted, 0.5),
    gps_accuracy_p90_m: percentile(sorted, 0.9),
  };
}
