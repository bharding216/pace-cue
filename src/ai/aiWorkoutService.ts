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
  WorkoutInterval,
  WorkoutRepeatBlock,
  generateId,
  totalWorkoutSeconds,
  formatTime,
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
 * Enforce mutual exclusivity of effort vs. targetPace on each interval.
 * If the AI returns both, keep effort (more universally useful) and drop pace.
 */
function sanitizeBlock(block: WorkoutRepeatBlock): WorkoutRepeatBlock {
  return {
    ...block,
    intervals: block.intervals.map((interval) => {
      if (interval.effort != null && interval.targetPace != null) {
        const { targetPace, ...rest } = interval;
        return rest;
      }
      return interval;
    }),
  };
}

/**
 * Serialize a workout into a concise text block so the AI can reference
 * the exact structure (durations, repeat counts, effort/pace) when the
 * user asks for edits in a follow-up message.
 */
function serializeWorkoutForContext(workout: WorkoutDefinition): string {
  const total = formatTime(totalWorkoutSeconds(workout));

  const serializeBlock = (b: WorkoutRepeatBlock) => {
    const header = b.repeatCount > 1 ? ` (×${b.repeatCount})` : '';
    const name = b.name ? `${b.name}${header}` : header.trim();
    const intervals = b.intervals.map((i) => {
      const parts = [
        `${i.label ?? i.type}: ${formatTime(i.durationSeconds)}`,
      ];
      if (i.effort != null) parts.push(`effort ${i.effort}/10`);
      if (i.targetPace != null) {
        const m = Math.floor(i.targetPace);
        const s = Math.round((i.targetPace - m) * 60);
        parts.push(`pace ${m}:${s.toString().padStart(2, '0')}/mi`);
      }
      return `    - ${parts.join(', ')}`;
    });
    return name
      ? `  ${name}\n${intervals.join('\n')}`
      : intervals.map((l) => `  ${l.trimStart()}`).join('\n');
  };

  const sections: string[] = [];
  if (workout.warmup.length)
    sections.push(`Warm Up:\n${workout.warmup.map(serializeBlock).join('\n')}`);
  if (workout.blocks.length)
    sections.push(`Intervals:\n${workout.blocks.map(serializeBlock).join('\n')}`);
  if (workout.cooldown.length)
    sections.push(`Cool Down:\n${workout.cooldown.map(serializeBlock).join('\n')}`);

  return `[Workout: "${workout.name}" — Total: ${total}]\n${sections.join('\n')}`;
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
  // Include structured workout data in conversation so the AI can accurately
  // reference and edit prior proposals (durations, repeat counts, etc.)
  const enrichedConversation = conversationHistory.map((m) => ({
    role: m.role,
    content: m.workout
      ? `${m.content}\n\n${serializeWorkoutForContext(m.workout)}`
      : m.content,
  }));

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
      conversation: enrichedConversation,
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

  // Build a full WorkoutDefinition from the AI response.
  // Sanitize blocks so each interval has at most one of effort / targetPace.
  const now = Date.now();
  const rawWarmup: WorkoutRepeatBlock[] = data.workout?.warmup ?? [];
  const rawBlocks: WorkoutRepeatBlock[] = data.workout?.blocks ?? [];
  const rawCooldown: WorkoutRepeatBlock[] = data.workout?.cooldown ?? [];

  const workout: WorkoutDefinition = {
    id: generateId(),
    name: data.workout?.name ?? 'AI Workout',
    warmup: rawWarmup.map(sanitizeBlock),
    blocks: rawBlocks.map(sanitizeBlock),
    cooldown: rawCooldown.map(sanitizeBlock),
    createdAt: now,
    updatedAt: now,
  };

  return {
    workout,
    message: data.message ?? 'Here\'s a workout for you!',
  };
}
