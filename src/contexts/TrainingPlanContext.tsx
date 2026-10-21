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
  loadPlanWorkouts,
  loadUserPlanWorkouts,
  ensureCustomPlan,
  skipPlanWorkout as skipPlanWorkoutApi,
  removePlanWorkout as removePlanWorkoutApi,
  completePlanWorkout as completePlanWorkoutApi,
  archivePlan as archivePlanApi,
  ensureUpcomingWorkoutsDetailed,
} from '../ai/planService';
import { loadHistory } from '../workout/workoutStorage';

// ── Types ────────────────────────────────────────────────────

/** A unified entry for a single day, containing both plan and history data. */
export interface DayEntry {
  date: string; // YYYY-MM-DD
  planWorkout?: PlanWorkout;
  completedRuns: CompletedWorkout[];
}

interface TrainingPlanContextType {
  /** All active plans */
  plans: TrainingPlan[];
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
  /** Skip a planned workout */
  skipWorkout: (workoutId: string) => Promise<void>;
  /** Remove a planned workout from the calendar entirely */
  removeWorkout: (workoutId: string) => Promise<void>;
  /** Mark a planned workout as completed */
  completeWorkout: (workoutId: string, completedWorkoutId: string) => Promise<void>;
  /** Archive a specific plan */
  archivePlan: (planId?: string) => Promise<void>;
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
): Record<string, DayEntry> {
  const entries: Record<string, DayEntry> = {};

  // Plan workouts
  for (const pw of planWorkouts) {
    if (!entries[pw.date]) {
      entries[pw.date] = { date: pw.date, completedRuns: [] };
    }
    entries[pw.date].planWorkout = pw;
  }

  // Completed runs
  for (const run of history) {
    const key = toDateKey(run.completedAt);
    if (!entries[key]) {
      entries[key] = { date: key, completedRuns: [] };
    }
    entries[key].completedRuns.push(run);
  }

  return entries;
}

// ── Provider ─────────────────────────────────────────────────

export function TrainingPlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [planWorkouts, setPlanWorkouts] = useState<PlanWorkout[]>([]);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const isGeneratingDetails = useRef(false);

  // Primary plan: first non-custom active plan (backward compat)
  const plan = plans.find((p) => p.race_type !== 'custom') ?? plans[0] ?? null;

  const refresh = useCallback(async () => {
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

      // Load all active plans
      const activePlans = await loadActivePlans(user.id);
      setPlans(activePlans);

      // Load ALL plan workouts for this user (across all plans)
      const allWorkouts = await loadUserPlanWorkouts(user.id);
      setPlanWorkouts(allWorkouts);

      // Auto-fill upcoming workout details for each non-custom plan
      const racePlans = activePlans.filter((p) => p.race_type !== 'custom');
      if (racePlans.length > 0 && !isGeneratingDetails.current) {
        isGeneratingDetails.current = true;
        Promise.all(
          racePlans.map((rp) => {
            const rpWorkouts = allWorkouts.filter((w) => w.plan_id === rp.id);
            return ensureUpcomingWorkoutsDetailed(rp, rpWorkouts);
          })
        )
          .then((results) => {
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

  const dayEntries = buildDayEntries(planWorkouts, history);

  const skipWorkout = useCallback(async (workoutId: string) => {
    await skipPlanWorkoutApi(workoutId);
    setPlanWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, status: 'skipped' as const } : w))
    );
  }, []);

  const removeWorkout = useCallback(async (workoutId: string) => {
    await removePlanWorkoutApi(workoutId);
    setPlanWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  }, []);

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
    setPlans((prev) => prev.filter((p) => p.id !== targetId));
    setPlanWorkouts((prev) => prev.filter((w) => w.plan_id !== targetId));
  }, [plan?.id]);

  const ensurePlanFn = useCallback(async (): Promise<TrainingPlan> => {
    // Return existing custom plan, or create one for manual workout additions
    const customPlan = plans.find((p) => p.race_type === 'custom');
    if (customPlan) return customPlan;
    if (!user) throw new Error('Must be signed in');
    const created = await ensureCustomPlan(user.id);
    setPlans((prev) => [...prev, created]);
    return created;
  }, [plans, user]);

  return (
    <TrainingPlanContext.Provider
      value={{
        plans,
        plan,
        planWorkouts,
        history,
        dayEntries,
        loading,
        refresh,
        ensurePlan: ensurePlanFn,
        skipWorkout,
        removeWorkout,
        completeWorkout,
        archivePlan: archivePlanFn,
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
