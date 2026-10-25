/**
 * generate-workouts — Supabase Edge Function
 *
 * On-demand batch workout detail generator. Given plan context and a
 * list of dates, returns full structured WorkoutObjects for those dates.
 * Typically called for 3 workouts at a time.
 *
 * Deploy:  supabase functions deploy generate-workouts
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

interface RunnerProfile {
  experience_level?: string;
  typical_run_minutes?: number;
  typical_run_minutes_max?: number;
  easy_pace?: number;
  fast_pace?: number;
  race_times?: Record<string, unknown>;
}

interface WorkoutRequest {
  date: string;
  day_label: string;
  description: string | null;
  week_number: number;
  week_theme: string;
  total_miles_target: number | null;
}

interface RequestBody {
  profile?: RunnerProfile;
  race_type: string;
  race_date: string;
  goal_time_minutes?: number | null;
  days_per_week: number;
  total_weeks: number;
  workouts: WorkoutRequest[];
}

// ── System prompt ────────────────────────────────────────────

function buildSystemPrompt(body: RequestBody): string {
  const sections: string[] = [];

  const raceLabel = body.race_type === 'custom'
    ? 'custom race'
    : body.race_type.replace('_', ' ');

  sections.push(`You are SplitCue's AI running coach. You create detailed, structured workout definitions for specific training days within an existing plan.

You are generating detailed workouts for a ${raceLabel} training plan (${body.total_weeks} weeks total, ${body.days_per_week} days/week, race on ${body.race_date}).

Each workout must be a complete structured interval workout matching the SplitCue format with warmup, blocks, and cooldown sections.`);

  // Runner profile
  const profile = body.profile;
  if (profile) {
    const parts: string[] = [];
    if (profile.experience_level) parts.push(`Experience: ${profile.experience_level}`);
    if (profile.typical_run_minutes) {
      const max = profile.typical_run_minutes_max;
      parts.push(`Typical run: ${profile.typical_run_minutes}${max ? `–${max}` : ''} min`);
    }
    if (profile.easy_pace) {
      const m = Math.floor(profile.easy_pace);
      const s = Math.round((profile.easy_pace - m) * 60);
      parts.push(`Easy pace: ${m}:${s.toString().padStart(2, "0")}/mi`);
    }
    if (profile.fast_pace) {
      const m = Math.floor(profile.fast_pace);
      const s = Math.round((profile.fast_pace - m) * 60);
      parts.push(`Fast pace: ${m}:${s.toString().padStart(2, "0")}/mi`);
    }
    if (parts.length > 0) {
      sections.push(`## Runner Profile\n${parts.join(" | ")}`);
    }
  }

  if (body.goal_time_minutes) {
    const hrs = Math.floor(body.goal_time_minutes / 60);
    const mins = Math.round(body.goal_time_minutes % 60);
    sections.push(`## Goal Time\n${hrs > 0 ? `${hrs}h ` : ''}${mins}m`);
  }

  // The workouts to generate
  const workoutDescs = body.workouts.map((w) =>
    `- ${w.date} (Week ${w.week_number}, ${w.week_theme}): ${w.day_label}${w.description ? ` — ${w.description}` : ''}${w.total_miles_target ? ` [week target: ${w.total_miles_target} mi]` : ''}`
  ).join("\n");
  sections.push(`## Workouts to Generate\n${workoutDescs}`);

  // Output schema
  sections.push(`## Output Schema

Respond with ONLY a JSON object (no markdown fences, no extra text) matching:

{
  "workouts": [
    {
      "date": "YYYY-MM-DD",
      "workout": {
        "name": "string — short name matching the day_label",
        "warmup": [RepeatBlock],
        "blocks": [RepeatBlock],
        "cooldown": [RepeatBlock]
      }
    }
  ]
}

RepeatBlock = {
  "intervals": [Interval],
  "repeatCount": number,
  "name": "string (optional) — one of: Sprint, Pace, Tempo, Recovery, Jog, Stride, Threshold, Race Pace, Cruise, Fartlek, Hill, Build Up, Easy Run, Steady, Speed, Endurance"
}

Interval = {
  "type": "warmup" | "hard" | "easy" | "cooldown",
  "durationSeconds": number,
  "label": "string (optional)",
  "effort": number (optional, RPE 1-10),
  "targetPace": number (optional, min/mile e.g. 8.5 = 8:30/mi)
}

Rules:
- effort and targetPace are MUTUALLY EXCLUSIVE per interval. Use at most one.
- If the runner has pace data, prefer targetPace for hard/tempo intervals.
- durationSeconds must be a positive integer.
- repeatCount must be a positive integer (1 = no repeat).
- warmup and cooldown can be empty [].
- blocks must have at least one RepeatBlock.
- Return one workout object per date requested, in the same order.
- Match the workout to the day_label and description from the plan outline.
- Scale intensity and volume to the training phase (week_theme) and weekly mileage target.`);

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

    if (!body.workouts?.length) {
      return new Response(
        JSON.stringify({ error: "workouts array is required and must not be empty" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(body);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate detailed workouts for these ${body.workouts.length} training days.` },
        ],
        temperature: 0.7,
        max_tokens: 8192,
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

    return new Response(
      JSON.stringify(result),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("generate-workouts error:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
