/**
 * AI Workout Builder service.
 *
 * Calls a Supabase Edge Function that orchestrates the LLM call.
 * The edge function receives the user's prompt + running profile
 * context and returns a WorkoutDefinition-compatible JSON object.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  EXTERNAL SETUP REQUIRED — see SETUP.md                │
 * │                                                        │
 * │  1. Create Supabase Edge Function `generate-workout`   │
 * │  2. Add your LLM API key as a Supabase secret          │
 * │  3. The function should accept:                        │
 * │       { prompt, profile, preferences, history_summary } │
 * │     and return:                                        │
 * │       { workout: WorkoutDefinition, message: string }  │
 * └─────────────────────────────────────────────────────────┘
 */

import { supabase } from '../analytics/supabaseClient';
import {
  WorkoutDefinition,
  WorkoutRepeatBlock,
  generateId,
} from '../workout/workoutTypes';

export interface AIContext {
  experienceLevel?: string;
  typicalRunMinutes?: number;
  easyPace?: number;
  fastPace?: number;
  goals: string[];
  preferences: string[];
}

export interface AIResponse {
  workout: WorkoutDefinition;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  workout?: WorkoutDefinition;
  timestamp: number;
}

/**
 * Generate a workout via the AI edge function.
 *
 * Returns an AI response with a message and (optionally) a workout definition.
 */
export async function generateWorkout(
  prompt: string,
  context: AIContext,
  conversationHistory: ChatMessage[],
): Promise<AIResponse> {
  const { data, error } = await supabase.functions.invoke('generate-workout', {
    body: {
      prompt,
      profile: {
        experience_level: context.experienceLevel,
        typical_run_minutes: context.typicalRunMinutes,
        easy_pace: context.easyPace,
        fast_pace: context.fastPace,
      },
      goals: context.goals,
      preferences: context.preferences,
      conversation: conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    },
  });

  if (error) {
    const body = error.context
      ? await error.context.json().catch(() => null)
      : null;
    throw new Error(body?.error || error.message || 'Failed to generate workout');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  // Build a full WorkoutDefinition from the AI response
  const now = Date.now();
  const workout: WorkoutDefinition = {
    id: generateId(),
    name: data.workout?.name ?? 'AI Workout',
    warmup: data.workout?.warmup ?? [],
    blocks: data.workout?.blocks ?? [],
    cooldown: data.workout?.cooldown ?? [],
    createdAt: now,
    updatedAt: now,
  };

  return {
    workout,
    message: data.message ?? 'Here\'s a workout for you!',
  };
}
