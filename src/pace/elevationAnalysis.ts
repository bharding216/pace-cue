/**
 * Post-workout elevation analysis.
 *
 * Pure functions that take a recorded GPS route and produce:
 *  - smoothed altitude values
 *  - terrain segments (uphill / flat / downhill) with pace per segment
 *  - total elevation gain & loss
 */

import type { RoutePoint } from '../workout/workoutTypes';

const METERS_PER_MILE = 1_609.344;
const METERS_PER_KM = 1_000;

// ── Terrain segment types ────────────────────────────────────────────

export type TerrainType = 'uphill' | 'flat' | 'downhill';

export interface TerrainSegment {
  type: TerrainType;
  startIndex: number;
  endIndex: number;
  distanceMeters: number;
  durationMs: number;
  elevationChangeMeters: number;
  avgGradePercent: number;
  avgPaceMinPerMile: number | null;
  avgPaceMinPerKm: number | null;
}

export interface ElevationSummary {
  segments: TerrainSegment[];
  totalElevationGainMeters: number;
  totalElevationLossMeters: number;
  minAltitude: number;
  maxAltitude: number;
  /** Smoothed altitude values aligned 1:1 with the input route points. */
  smoothedAltitudes: number[];
}

// ── Grade thresholds ─────────────────────────────────────────────────

const UPHILL_ENTER = 2; // grade % to start classifying as uphill
const DOWNHILL_ENTER = -2; // grade % to start classifying as downhill
const UPHILL_EXIT = 1; // grade % to leave uphill (hysteresis)
const DOWNHILL_EXIT = -1; // grade % to leave downhill (hysteresis)
const MIN_SEGMENT_DISTANCE_M = 100; // merge segments shorter than this

// ── Smoothing ────────────────────────────────────────────────────────

/**
 * Distance-weighted moving average for altitude.
 *
 * Uses a window defined by horizontal distance (default 75 m) rather
 * than a fixed sample count, so the smoothing adapts to GPS sample
 * density. Points without valid altitude are interpolated.
 */
export function smoothAltitudes(
  route: RoutePoint[],
  windowMeters: number = 75,
): number[] {
  if (route.length === 0) return [];

  // First pass: fill missing altitudes via linear interpolation
  const raw = interpolateAltitudes(route);

  // Second pass: distance-weighted moving average
  const smoothed: number[] = new Array(raw.length);
  const halfWindow = windowMeters / 2;

  for (let i = 0; i < raw.length; i++) {
    const centerDist = route[i].dist;
    let sumAlt = 0;
    let sumWeight = 0;

    // Expand window both directions by distance
    for (let j = i; j >= 0 && centerDist - route[j].dist <= halfWindow; j--) {
      const w = 1 - Math.abs(route[j].dist - centerDist) / halfWindow;
      sumAlt += raw[j] * w;
      sumWeight += w;
    }
    for (
      let j = i + 1;
      j < raw.length && route[j].dist - centerDist <= halfWindow;
      j++
    ) {
      const w = 1 - Math.abs(route[j].dist - centerDist) / halfWindow;
      sumAlt += raw[j] * w;
      sumWeight += w;
    }

    smoothed[i] = sumWeight > 0 ? sumAlt / sumWeight : raw[i];
  }

  return smoothed;
}

/**
 * Fill null altitudes via linear interpolation between known values.
 * If all are null, returns zeros.
 */
function interpolateAltitudes(route: RoutePoint[]): number[] {
  const alts: number[] = route.map((p) => p.alt ?? NaN);

  // Find first valid
  let firstValid = -1;
  for (let i = 0; i < alts.length; i++) {
    if (!isNaN(alts[i])) {
      firstValid = i;
      break;
    }
  }
  if (firstValid === -1) return alts.map(() => 0);

  // Back-fill leading NaNs
  for (let i = 0; i < firstValid; i++) alts[i] = alts[firstValid];

  // Forward interpolate
  let lastKnown = firstValid;
  for (let i = firstValid + 1; i < alts.length; i++) {
    if (!isNaN(alts[i])) {
      // Interpolate between lastKnown and i
      if (i - lastKnown > 1) {
        const dAlt = alts[i] - alts[lastKnown];
        const dDist = route[i].dist - route[lastKnown].dist;
        for (let k = lastKnown + 1; k < i; k++) {
          const frac =
            dDist > 0
              ? (route[k].dist - route[lastKnown].dist) / dDist
              : 0;
          alts[k] = alts[lastKnown] + dAlt * frac;
        }
      }
      lastKnown = i;
    }
  }

  // Forward-fill trailing NaNs
  for (let i = lastKnown + 1; i < alts.length; i++) alts[i] = alts[lastKnown];

  return alts;
}

// ── Grade classification ─────────────────────────────────────────────

/** Classify a grade value using hysteresis around the current terrain type. */
function classifyGrade(grade: number, current: TerrainType): TerrainType {
  switch (current) {
    case 'uphill':
      if (grade < UPHILL_EXIT) {
        return grade <= DOWNHILL_ENTER ? 'downhill' : 'flat';
      }
      return 'uphill';
    case 'downhill':
      if (grade > DOWNHILL_EXIT) {
        return grade >= UPHILL_ENTER ? 'uphill' : 'flat';
      }
      return 'downhill';
    case 'flat':
    default:
      if (grade >= UPHILL_ENTER) return 'uphill';
      if (grade <= DOWNHILL_ENTER) return 'downhill';
      return 'flat';
  }
}

// ── Segment building ─────────────────────────────────────────────────

/**
 * Analyse a recorded route and return terrain segments with pace.
 *
 * Requires at least 2 route points with some non-null altitude data.
 */
export function analyzeElevation(route: RoutePoint[]): ElevationSummary | null {
  if (route.length < 2) return null;

  const smoothed = smoothAltitudes(route);

  // Check that we have meaningful altitude data (not all zeros from interpolation)
  const hasAltitude = route.some((p) => p.alt != null);
  if (!hasAltitude) return null;

  // Build per-point grades (% grade over local distance)
  const grades: number[] = new Array(route.length).fill(0);
  for (let i = 1; i < route.length; i++) {
    const dDist = route[i].dist - route[i - 1].dist;
    const dAlt = smoothed[i] - smoothed[i - 1];
    grades[i] = dDist > 0.5 ? (dAlt / dDist) * 100 : grades[i - 1];
  }
  grades[0] = grades.length > 1 ? grades[1] : 0;

  // Smooth grades with a small window to prevent jitter
  const smoothedGrades = smoothGrades(grades, route, 50);

  // Classify each point
  const types: TerrainType[] = new Array(route.length);
  types[0] = classifyGrade(smoothedGrades[0], 'flat');
  for (let i = 1; i < route.length; i++) {
    types[i] = classifyGrade(smoothedGrades[i], types[i - 1]);
  }

  // Build raw segments
  let rawSegments: RawSegment[] = [];
  let segStart = 0;
  for (let i = 1; i < types.length; i++) {
    if (types[i] !== types[segStart]) {
      rawSegments.push({ type: types[segStart], start: segStart, end: i - 1 });
      segStart = i;
    }
  }
  rawSegments.push({ type: types[segStart], start: segStart, end: route.length - 1 });

  // Merge short segments into neighbours
  rawSegments = mergeShortSegments(rawSegments, route);

  // Convert to TerrainSegments with pace
  const segments: TerrainSegment[] = rawSegments.map((seg) => {
    const dist = route[seg.end].dist - route[seg.start].dist;
    const dur = route[seg.end].ts - route[seg.start].ts;
    const elev = smoothed[seg.end] - smoothed[seg.start];
    const grade = dist > 0 ? (elev / dist) * 100 : 0;
    const mps = dur > 0 ? dist / (dur / 1000) : null;

    return {
      type: seg.type,
      startIndex: seg.start,
      endIndex: seg.end,
      distanceMeters: dist,
      durationMs: dur,
      elevationChangeMeters: elev,
      avgGradePercent: Math.round(grade * 10) / 10,
      avgPaceMinPerMile:
        mps && mps > 0.3 ? METERS_PER_MILE / mps / 60 : null,
      avgPaceMinPerKm:
        mps && mps > 0.3 ? METERS_PER_KM / mps / 60 : null,
    };
  });

  // Elevation totals from smoothed data
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const d = smoothed[i] - smoothed[i - 1];
    if (d > 0) gain += d;
    else loss += Math.abs(d);
  }

  const validAlts = smoothed.filter((_, i) => route[i].alt != null);
  const minAlt = validAlts.length > 0 ? Math.min(...validAlts) : 0;
  const maxAlt = validAlts.length > 0 ? Math.max(...validAlts) : 0;

  return {
    segments,
    totalElevationGainMeters: Math.round(gain),
    totalElevationLossMeters: Math.round(loss),
    minAltitude: Math.round(minAlt),
    maxAltitude: Math.round(maxAlt),
    smoothedAltitudes: smoothed,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

interface RawSegment {
  type: TerrainType;
  start: number;
  end: number;
}

/** Smooth grade values with a distance-based window. */
function smoothGrades(
  grades: number[],
  route: RoutePoint[],
  windowMeters: number,
): number[] {
  const result: number[] = new Array(grades.length);
  const half = windowMeters / 2;

  for (let i = 0; i < grades.length; i++) {
    const center = route[i].dist;
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0 && center - route[j].dist <= half; j--) {
      sum += grades[j];
      count++;
    }
    for (let j = i + 1; j < grades.length && route[j].dist - center <= half; j++) {
      sum += grades[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }

  return result;
}

/**
 * Merge segments shorter than MIN_SEGMENT_DISTANCE_M into the adjacent
 * segment they are most similar to (preferring the previous neighbour).
 */
function mergeShortSegments(
  segments: RawSegment[],
  route: RoutePoint[],
): RawSegment[] {
  if (segments.length <= 1) return segments;

  let merged = [...segments];
  let changed = true;

  while (changed) {
    changed = false;
    const next: RawSegment[] = [];

    for (let i = 0; i < merged.length; i++) {
      const seg = merged[i];
      const dist = route[seg.end].dist - route[seg.start].dist;

      if (dist < MIN_SEGMENT_DISTANCE_M && merged.length > 1) {
        // Absorb into previous or next segment
        if (next.length > 0) {
          next[next.length - 1].end = seg.end;
          changed = true;
        } else if (i + 1 < merged.length) {
          merged[i + 1].start = seg.start;
          changed = true;
        } else {
          next.push(seg);
        }
      } else {
        next.push(seg);
      }
    }

    merged = next;
  }

  return merged;
}

// ── Aggregate helpers for UI ─────────────────────────────────────────

export interface TerrainAggregate {
  type: TerrainType;
  totalDistanceMeters: number;
  totalDurationMs: number;
  totalElevationChange: number;
  avgPaceMinPerMile: number | null;
  avgPaceMinPerKm: number | null;
}

/** Aggregate all segments of each terrain type for summary display. */
export function aggregateByTerrain(
  segments: TerrainSegment[],
): TerrainAggregate[] {
  const map = new Map<TerrainType, { dist: number; dur: number; elev: number }>();

  for (const seg of segments) {
    const agg = map.get(seg.type) ?? { dist: 0, dur: 0, elev: 0 };
    agg.dist += seg.distanceMeters;
    agg.dur += seg.durationMs;
    agg.elev += seg.elevationChangeMeters;
    map.set(seg.type, agg);
  }

  const order: TerrainType[] = ['uphill', 'flat', 'downhill'];
  const result: TerrainAggregate[] = [];

  for (const type of order) {
    const agg = map.get(type);
    if (!agg || agg.dist < 1) continue;
    const mps = agg.dur > 0 ? agg.dist / (agg.dur / 1000) : null;
    result.push({
      type,
      totalDistanceMeters: agg.dist,
      totalDurationMs: agg.dur,
      totalElevationChange: agg.elev,
      avgPaceMinPerMile:
        mps && mps > 0.3 ? METERS_PER_MILE / mps / 60 : null,
      avgPaceMinPerKm:
        mps && mps > 0.3 ? METERS_PER_KM / mps / 60 : null,
    });
  }

  return result;
}
