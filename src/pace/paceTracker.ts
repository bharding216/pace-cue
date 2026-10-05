/**
 * Pure functions for GPS pace calculation.
 *
 * No React, no side effects — just math on GPS samples.
 * Uses the Haversine formula for distance between coordinates
 * and a rolling time-window for pace smoothing.
 */

import {
  GpsSample,
  PaceState,
  PaceWindowSize,
  MAX_ACCURACY_METERS,
  MIN_SAMPLES_FOR_PACE,
  createPaceState,
} from './paceTypes';

const EARTH_RADIUS_METERS = 6_371_000;
const METERS_PER_MILE = 1_609.344;
const METERS_PER_KM = 1_000;

/** Convert degrees to radians. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two GPS points in meters. */
export function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Add a GPS sample and recompute pace.
 * Returns a new PaceState (immutable).
 */
export function addSample(
  state: PaceState,
  sample: GpsSample,
  windowSeconds: PaceWindowSize,
): PaceState {
  // Reject noisy samples
  if (sample.accuracy > MAX_ACCURACY_METERS) return state;

  const samples = [...state.samples, sample];

  // Accumulate total distance from the last accepted sample
  let totalDistanceMeters = state.totalDistanceMeters;
  if (state.samples.length > 0) {
    const prev = state.samples[state.samples.length - 1];
    totalDistanceMeters += haversineMeters(prev, sample);
  }

  // Compute rolling-window pace
  const pace = computeRollingPace(samples, windowSeconds, sample.timestamp);

  // Prune old samples (keep 2× the window to avoid edge effects)
  const pruneCutoff = sample.timestamp - windowSeconds * 2 * 1000;
  const prunedSamples = samples.filter((s) => s.timestamp >= pruneCutoff);

  return {
    samples: prunedSamples,
    currentPaceMps: pace.paceMps,
    currentPaceMinPerMile: pace.paceMinPerMile,
    currentPaceMinPerKm: pace.paceMinPerKm,
    totalDistanceMeters,
  };
}

/** Compute pace over a rolling time window. */
function computeRollingPace(
  samples: GpsSample[],
  windowSeconds: number,
  now: number,
): {
  paceMps: number | null;
  paceMinPerMile: number | null;
  paceMinPerKm: number | null;
} {
  const cutoff = now - windowSeconds * 1000;
  const windowSamples = samples.filter(
    (s) => s.timestamp >= cutoff && s.accuracy <= MAX_ACCURACY_METERS,
  );

  if (windowSamples.length < MIN_SAMPLES_FOR_PACE) {
    return { paceMps: null, paceMinPerMile: null, paceMinPerKm: null };
  }

  let distance = 0;
  for (let i = 1; i < windowSamples.length; i++) {
    distance += haversineMeters(windowSamples[i - 1], windowSamples[i]);
  }

  const elapsed =
    (windowSamples[windowSamples.length - 1].timestamp -
      windowSamples[0].timestamp) /
    1000;

  if (elapsed < 2 || distance < 1) {
    return { paceMps: null, paceMinPerMile: null, paceMinPerKm: null };
  }

  const mps = distance / elapsed;

  // Guard against unrealistically slow or fast readings
  if (mps < 0.3 || mps > 15) {
    return { paceMps: null, paceMinPerMile: null, paceMinPerKm: null };
  }

  const minPerMile = METERS_PER_MILE / mps / 60;
  const minPerKm = METERS_PER_KM / mps / 60;

  return { paceMps: mps, paceMinPerMile: minPerMile, paceMinPerKm: minPerKm };
}

/** Format a pace value (decimal minutes) into "M:SS" display string. */
export function formatPaceDisplay(paceMinutes: number | null): string {
  if (paceMinutes == null || !isFinite(paceMinutes)) return '--:--';
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format a pace value into speech-friendly text. */
export function formatPaceForSpeech(paceMinutes: number | null): string {
  if (paceMinutes == null || !isFinite(paceMinutes)) return 'unavailable';
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  if (secs === 0) {
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  }
  return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ${secs} ${secs === 1 ? 'second' : 'seconds'}`;
}

/** Format total distance for display. */
export function formatDistance(meters: number, unit: 'minPerMile' | 'minPerKm'): string {
  if (unit === 'minPerMile') {
    const miles = meters / METERS_PER_MILE;
    return `${miles.toFixed(2)} mi`;
  }
  const km = meters / METERS_PER_KM;
  return `${km.toFixed(2)} km`;
}

/** Reset pace state (e.g. when starting a new workout). */
export function resetPaceState(): PaceState {
  return createPaceState();
}
