/**
 * Training Plan context — manages the active plan, workouts by date,
 * and merges plan workouts with completed run history for unified
 * calendar/list views.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import type { TrainingPlan, PlanWorkout } from '../types/database';
import type { CompletedWorkout } from '../workout/workoutTypes';
import {
  loadActivePlans,
  loadArchivedPlans,
  loadPlanWorkouts,
  loadUserPlanWorkouts,
  ensureCustomPlan,
  removePlanWorkout as removePlanWorkoutApi,
  movePlanWorkout as movePlanWorkoutApi,
  completePlanWorkout as completePlanWorkoutApi,
  archivePlan as archivePlanApi,
  restorePlan as restorePlanApi,
  updateTrainingPlan as updateTrainingPlanApi,
  ensureUpcomingWorkoutsDetailed,
} from '../ai/planService';
import { loadHistory } from '../workout/workoutStorage';

// ── Types ────────────────────────────────────────────────────

/** A unified entry for a single day, containing both plan and history data. */
export interface DayEntry {
  date: string; // YYYY-MM-DD
  planWorkouts: PlanWorkout[];
  completedRuns: CompletedWorkout[];
}

interface TrainingPlanContextType {
  /** All active plans */
  plans: TrainingPlan[];
  /** Archived plans */
  archivedPlans: TrainingPlan[];
  /** Primary active plan (first non-custom, for backward compat) */
  plan: TrainingPlan | null;
  planWorkouts: PlanWorkout[];
  history: CompletedWorkout[];
  /** Map of YYYY-MM-DD → DayEntry for calendar rendering */
  dayEntries: Record<string, DayEntry>;
  loading: boolean;
  /** Reload plan + history data */
  refresh: () => Promise<void>;
  /** Ensure a custom plan exists (for manual workout additions), then refresh. */
  ensurePlan: () => Promise<TrainingPlan>;
  /** Remove a planned workout from the calendar entirely */
  removeWorkout: (workoutId: string) => Promise<void>;
  /** Move a planned workout to a different date */
  moveWorkout: (workoutId: string, newDate: string) => Promise<void>;
  /** Mark a planned workout as completed */
  completeWorkout: (workoutId: string, completedWorkoutId: string) => Promise<void>;
  /** Archive a specific plan */
  archivePlan: (planId?: string) => Promise<void>;
  /** Restore an archived plan back to active */
  restorePlan: (planId: string) => Promise<void>;
  /** Update mutable plan fields (race_date, days_per_week, etc.) */
  updatePlan: (planId: string, fields: Partial<Pick<import('../types/database').TrainingPlan, 'race_date' | 'days_per_week' | 'title' | 'goal_time_minutes' | 'goal_pace'>>) => Promise<void>;
}

const TrainingPlanContext = createContext<TrainingPlanContextType | null>(null);

// ── Helpers ──────────────────────────────────────────────────

function toDateKey(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDayEntries(
  planWorkouts: PlanWorkout[],
  history: CompletedWorkout[],
  primaryPlanId: string | null,
): Record<string, DayEntry> {
  const entries: Record<string, DayEntry> = {};

  // Plan workouts — sort so the primary plan's workouts come last (appear first in the array
  // when we unshift), giving them visual priority while keeping all workouts accessible.
  const sorted = [...planWorkouts].sort((a, b) => {
    const aIsPrimary = a.plan_id === primaryPlanId ? 1 : 0;
    const bIsPrimary = b.plan_id === primaryPlanId ? 1 : 0;
    if (aIsPrimary !== bIsPrimary) return aIsPrimary - bIsPrimary;
    return a.date.localeCompare(b.date);
  });

  for (const pw of sorted) {
    if (!entries[pw.date]) {
      entries[pw.date] = { date: pw.date, planWorkouts: [], completedRuns: [] };
    }
    entries[pw.date].planWorkouts.push(pw);
  }

  // Completed runs
  for (const run of history) {
    const key = toDateKey(run.completedAt);
    if (!entries[key]) {
      entries[key] = { date: key, planWorkouts: [], completedRuns: [] };
    }
    entries[key].completedRuns.push(run);
  }

  return entries;
}

// ── Provider ─────────────────────────────────────────────────

export function TrainingPlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [archivedPlans, setArchivedPlans] = useState<TrainingPlan[]>([]);
  const [planWorkouts, setPlanWorkouts] = useState<PlanWorkout[]>([]);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const isGeneratingDetails = useRef(false);
  /** Incremented on each refresh so stale background tasks can detect they're outdated. */
  const refreshEpoch = useRef(0);

  // Primary plan: first real training plan (non-custom, or custom with outline)
  const plan = plans.find((p) => p.race_type !== 'custom' || !!(p.outline && p.outline.length > 0)) ?? plans[0] ?? null;

  const refresh = useCallback(async () => {
    const epoch = ++refreshEpoch.current;
    if (!hasLoadedOnce.current) setLoading(true);
    try {
      const historyData = await loadHistory();
      setHistory(historyData);

      if (!user) {
        setPlans([]);
        setPlanWorkouts([]);
        setLoading(false);
        return;
      }

      // Load all active plans + archived plans
      const [activePlans, archived] = await Promise.all([
        loadActivePlans(user.id),
        loadArchivedPlans(user.id),
      ]);
      setPlans(activePlans);
      setArchivedPlans(archived);

      // Load plan workouts only for active plans
      const activePlanIds = new Set(activePlans.map((p) => p.id));
      const allWorkouts = await loadUserPlanWorkouts(user.id);
      const activeWorkouts = allWorkouts.filter((w) => activePlanIds.has(w.plan_id));
      setPlanWorkouts(activeWorkouts);

      // Auto-fill upcoming workout details for each real training plan
      // (non-custom, or custom with outline). Only start if no other generation is in flight.
      const racePlans = activePlans.filter((p) => p.race_type !== 'custom' || !!(p.outline && p.outline.length > 0));
      if (racePlans.length > 0 && !isGeneratingDetails.current) {
        isGeneratingDetails.current = true;
        Promise.all(
          racePlans.map((rp) => {
            const rpWorkouts = allWorkouts.filter((w) => w.plan_id === rp.id);
            return ensureUpcomingWorkoutsDetailed(rp, rpWorkouts);
          })
        )
          .then((results) => {
            // If a newer refresh happened while we were generating, discard these results
            // to avoid overwriting fresher data with stale data.
            if (refreshEpoch.current !== epoch) {
              console.log('[TrainingPlan] Discarding stale detail generation results (epoch', epoch, 'vs current', refreshEpoch.current, ')');
              return;
            }

            const allUpdated = results.flat();
            if (allUpdated.length > 0) {
              const updatedIds = new Set(allUpdated.map((w) => w.id));
              setPlanWorkouts((prev) => [
                ...prev.filter((w) => !updatedIds.has(w.id)),
                ...allUpdated,
              ].sort((a, b) => a.date.localeCompare(b.date)));
            }
          })
          .finally(() => {
            isGeneratingDetails.current = false;
          });
      }
    } catch (err) {
      console.warn('Failed to load training data:', err);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dayEntries = buildDayEntries(planWorkouts, history, plan?.id ?? null);

  const removeWorkout = useCallback(async (workoutId: string) => {
    await removePlanWorkoutApi(workoutId);
    setPlanWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  }, []);

  const moveWorkout = useCallback(async (workoutId: string, newDate: string) => {
    const workout = planWorkouts.find((w) => w.id === workoutId);
    if (!workout) return;
    const ownerPlan = plans.find((p) => p.id === workout.plan_id);
    const startDate = ownerPlan?.start_date ?? newDate;
    await movePlanWorkoutApi(workoutId, newDate, startDate);
    const start = new Date(startDate);
    const target = new Date(newDate);
    const diffMs = target.getTime() - start.getTime();
    const weekNumber = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
    setPlanWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, date: newDate, week_number: weekNumber } : w))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  }, [planWorkouts, plans]);

  const completeWorkout = useCallback(
    async (workoutId: string, completedWorkoutId: string) => {
      await completePlanWorkoutApi(workoutId, completedWorkoutId);
      setPlanWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId
            ? { ...w, status: 'completed' as const, completed_workout_id: completedWorkoutId }
            : w
        )
      );
    },
    [],
  );

  const archivePlanFn = useCallback(async (planId?: string) => {
    const targetId = planId ?? plan?.id;
    if (!targetId) return;
    await archivePlanApi(targetId);
    const archivedPlan = plans.find((p) => p.id === targetId);
    setPlans((prev) => prev.filter((p) => p.id !== targetId));
    setPlanWorkouts((prev) => prev.filter((w) => w.plan_id !== targetId));
    if (archivedPlan) {
      setArchivedPlans((prev) => [{ ...archivedPlan, status: 'archived' }, ...prev]);
    }
  }, [plan?.id, plans]);

  const restorePlanFn = useCallback(async (planId: string) => {
    await restorePlanApi(planId);
    const restoredPlan = archivedPlans.find((p) => p.id === planId);
    setArchivedPlans((prev) => prev.filter((p) => p.id !== planId));
    if (restoredPlan) {
      setPlans((prev) => [...prev, { ...restoredPlan, status: 'active' }]);
    }
    // Reload workouts to include the restored plan's workouts
    if (user) {
      const allWorkouts = await loadUserPlanWorkouts(user.id);
      setPlanWorkouts(allWorkouts);
    }
  }, [archivedPlans, user]);

  const ensurePlanFn = useCallback(async (): Promise<TrainingPlan> => {
    // Return existing custom plan, or create one for manual workout additions
    const customPlan = plans.find((p) => p.race_type === 'custom');
    if (customPlan) return customPlan;
    if (!user) throw new Error('Must be signed in');
    const created = await ensureCustomPlan(user.id);
    setPlans((prev) => [...prev, created]);
    return created;
  }, [plans, user]);

  const updatePlanFn = useCallback(async (
    planId: string,
    fields: Partial<Pick<TrainingPlan, 'race_date' | 'days_per_week' | 'title' | 'goal_time_minutes' | 'goal_pace'>>,
  ) => {
    await updateTrainingPlanApi(planId, fields);
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, ...fields, updated_at: new Date().toISOString() } : p)),
    );
  }, []);

  return (
    <TrainingPlanContext.Provider
      value={{
        plans,
        archivedPlans,
        plan,
        planWorkouts,
        history,
        dayEntries,
        loading,
        refresh,
        ensurePlan: ensurePlanFn,
        removeWorkout,
        moveWorkout,
        completeWorkout,
        archivePlan: archivePlanFn,
        restorePlan: restorePlanFn,
        updatePlan: updatePlanFn,
      }}
    >
      {children}
    </TrainingPlanContext.Provider>
  );
}

export function useTrainingPlan(): TrainingPlanContextType {
  const ctx = useContext(TrainingPlanContext);
  if (!ctx) throw new Error('useTrainingPlan must be used inside TrainingPlanProvider');
  return ctx;
}
