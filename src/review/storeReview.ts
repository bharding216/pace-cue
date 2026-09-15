/**
 * Store review prompt logic.
 *
 * Asks the user for an App Store / Play Store review at positive moments
 * (right after completing a workout) — but only at engagement milestones
 * so we don't spam them.
 *
 * The native StoreKit / Google Play APIs also enforce their own rate limits,
 * so even if we call requestReview() the OS may silently no-op.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const STORAGE_KEY = '@pacecue/review_state';

interface ReviewState {
  /** Total workouts the user has completed (all-time). */
  completedCount: number;
  /** The completed-count at which we last triggered a prompt. */
  lastPromptedAt: number;
}

/**
 * Milestones (completed workout counts) at which we show the review prompt.
 * After the last explicit milestone we repeat every 50 workouts.
 */
const MILESTONES = [3, 10, 25, 50];
const REPEAT_EVERY = 50;

async function loadReviewState(): Promise<ReviewState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { completedCount: 0, lastPromptedAt: 0 };
  return JSON.parse(raw) as ReviewState;
}

async function saveReviewState(state: ReviewState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function shouldPrompt(state: ReviewState): boolean {
  const { completedCount, lastPromptedAt } = state;

  // Check explicit milestones
  for (const m of MILESTONES) {
    if (completedCount >= m && lastPromptedAt < m) {
      return true;
    }
  }

  // After all milestones, repeat every REPEAT_EVERY workouts
  const lastMilestone = MILESTONES[MILESTONES.length - 1];
  if (completedCount > lastMilestone) {
    const sinceLast = completedCount - lastPromptedAt;
    if (sinceLast >= REPEAT_EVERY) {
      return true;
    }
  }

  return false;
}

/**
 * Call after the user completes a workout. Increments the completed count
 * and — if we've hit a milestone — requests an in-app review.
 */
export async function onWorkoutCompleted(): Promise<void> {
  try {
    const state = await loadReviewState();
    state.completedCount += 1;

    if (shouldPrompt(state)) {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        // Small delay so the "Workout Complete!" screen has time to render
        await new Promise((r) => setTimeout(r, 1500));
        await StoreReview.requestReview();
      }
      state.lastPromptedAt = state.completedCount;
    }

    await saveReviewState(state);
  } catch {
    // Review prompts are best-effort — never crash the app over this.
  }
}
