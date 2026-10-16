/**
 * adjust-plan — Supabase Edge Function
 *
 * Handles conversational adjustments to an existing training plan.
 * Receives the current plan summary, user's adjustment request, and
 * conversation history. Returns specific workout modifications.
 *
 * Deploy:  supabase functions deploy adjust-plan
 * Secrets: supabase secrets set OPENAI_API_KEY=sk-...
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ────────────────────────────────────────────────────

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface PlanSummaryWorkout {
  date: string;
  day_label: string;
  status: string;
  week_number: number;
}

interface RequestBody {
  prompt: string;
  plan_summary: {
    title: string;
    race_type: string;
    race_date: string;
    start_date: string;
    days_per_week: number;
    total_weeks: number;
    workouts: PlanSummaryWorkout[];
  };
  profile?: {
    experience_level?: string;
    typical_run_minutes?: number;
    easy_pace?: number;
    fast_pace?: number;
  };
  conversation?: ConversationMessage[];
}

// ── System prompt ────────────────────────────────────────────

function buildSystemPrompt(body: RequestBody): string {
  const sections: string[] = [];

  sections.push(`You are PaceCue's AI running coach. The user has an existing training plan and wants to make adjustments.

Your role is to:
1. Understand what the user wants to change
2. Provide a friendly coaching response explaining the adjustment
3. Return specific workout modifications as structured JSON

Be encouraging and explain WHY you're making the changes (e.g. "Moving your long run to Saturday gives you more recovery time after Thursday's tempo session").`);

  // Plan context
  const plan = body.plan_summary;
  const upcomingWorkouts = plan.workouts
    .filter((w) => w.status === "planned")
    .slice(0, 21); // Next 3 weeks

  sections.push(`## Current Plan
Title: ${plan.title}
Race: ${plan.race_type} on ${plan.race_date}
Training days/week: ${plan.days_per_week}
Total weeks: ${plan.total_weeks}

### Upcoming Workouts (next 3 weeks)
${upcomingWorkouts.map((w) => `- ${w.date} (Week ${w.week_number}): ${w.day_label} [${w.status}]`).join("\n")}`);

  // Runner profile
  if (body.profile) {
    const parts: string[] = [];
    if (body.profile.experience_level) parts.push(`Experience: ${body.profile.experience_level}`);
    if (body.profile.easy_pace) {
      const m = Math.floor(body.profile.easy_pace);
      const s = Math.round((body.profile.easy_pace - m) * 60);
      parts.push(`Easy pace: ${m}:${s.toString().padStart(2, "0")}/mi`);
    }
    if (body.profile.fast_pace) {
      const m = Math.floor(body.profile.fast_pace);
      const s = Math.round((body.profile.fast_pace - m) * 60);
      parts.push(`Fast pace: ${m}:${s.toString().padStart(2, "0")}/mi`);
    }
    if (parts.length > 0) {
      sections.push(`## Runner Profile\n${parts.join(" | ")}`);
    }
  }

  // Output schema
  sections.push(`## Output Schema

Respond with ONLY a JSON object (no markdown fences):

{
  "message": "string — your coaching explanation of the changes",
  "modifications": [
    {
      "date": "YYYY-MM-DD",
      "action": "update" | "skip",
      "day_label": "string (if updating)",
      "description": "string (if updating)",
      "workout": WorkoutObject | null
    }
  ]
}

WorkoutObject = {
  "name": "string",
  "warmup": [RepeatBlock],
  "blocks": [RepeatBlock],
  "cooldown": [RepeatBlock]
}

RepeatBlock = {
  "intervals": [Interval],
  "repeatCount": number,
  "name": "string (optional)"
}

Interval = {
  "type": "warmup" | "hard" | "easy" | "cooldown",
  "durationSeconds": number,
  "label": "string (optional)",
  "effort": number (optional, RPE 1-10),
  "targetPace": number (optional, min/mile)
}

Rules:
- effort and targetPace are MUTUALLY EXCLUSIVE.
- Only include modifications for dates that need changes.
- action "skip" marks a workout as skipped (no workout data needed).
- action "update" replaces the workout for that date.
- If the user wants to swap two days, include both dates as "update" modifications.`);

  return sections.join("\n\n");
}

// ── Handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();

    if (!body.prompt || !body.plan_summary) {
      return new Response(
        JSON.stringify({ error: "prompt and plan_summary are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(body);
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (body.conversation?.length) {
      for (const msg of body.conversation) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: body.prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("adjust-plan error:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
