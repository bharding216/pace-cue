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
} from 'react';
import { useAuth } from './AuthContext';
import type { TrainingPlan, PlanWorkout } from '../types/database';
import type { CompletedWorkout } from '../workout/workoutTypes';
import {
  loadActivePlan,
  loadPlanWorkouts,
  skipPlanWorkout as skipPlanWorkoutApi,
  completePlanWorkout as completePlanWorkoutApi,
  archivePlan as archivePlanApi,
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
  plan: TrainingPlan | null;
  planWorkouts: PlanWorkout[];
  history: CompletedWorkout[];
  /** Map of YYYY-MM-DD → DayEntry for calendar rendering */
  dayEntries: Record<string, DayEntry>;
  loading: boolean;
  /** Reload plan + history data */
  refresh: () => Promise<void>;
  /** Skip a planned workout */
  skipWorkout: (workoutId: string) => Promise<void>;
  /** Mark a planned workout as completed */
  completeWorkout: (workoutId: string, completedWorkoutId: string) => Promise<void>;
  /** Archive the current plan */
  archivePlan: () => Promise<void>;
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
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [planWorkouts, setPlanWorkouts] = useState<PlanWorkout[]>([]);
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Load history from local storage (works for all users)
      const historyData = await loadHistory();
      setHistory(historyData);

      if (!user) {
        setPlan(null);
        setPlanWorkouts([]);
        setLoading(false);
        return;
      }

      // Load active plan from Supabase
      const activePlan = await loadActivePlan(user.id);
      setPlan(activePlan);

      if (activePlan) {
        const workouts = await loadPlanWorkouts(activePlan.id);
        setPlanWorkouts(workouts);
      } else {
        setPlanWorkouts([]);
      }
    } catch (err) {
      console.warn('Failed to load training data:', err);
    } finally {
      setLoading(false);
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

  const archivePlanFn = useCallback(async () => {
    if (!plan) return;
    await archivePlanApi(plan.id);
    setPlan(null);
    setPlanWorkouts([]);
  }, [plan]);

  return (
    <TrainingPlanContext.Provider
      value={{
        plan,
        planWorkouts,
        history,
        dayEntries,
        loading,
        refresh,
        skipWorkout,
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
