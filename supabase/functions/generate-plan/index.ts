/**
 * generate-plan — Supabase Edge Function
 *
 * Receives the user's running profile, race goal, and preferences.
 * Calls OpenAI to generate a full periodized training plan broken
 * into weeks of structured interval workouts.
 *
 * For plans longer than 12 weeks the function generates in 4-week
 * chunks via sequential API calls.
 *
 * Deploy:  supabase functions deploy generate-plan
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
  easy_pace?: number;
  fast_pace?: number;
}

interface RequestBody {
  profile?: RunnerProfile;
  goals?: string[];
  preferences?: string[];
  race_type: string;
  race_date: string;
  goal_time_minutes?: number | null;
  start_date: string;
  days_per_week: number;
  history_summary?: string | null;
}

interface PlanWeek {
  week_number: number;
  theme: string;
  workouts: PlanWorkoutEntry[];
}

interface PlanWorkoutEntry {
  date: string;
  day_label: string;
  description: string;
  workout: {
    name: string;
    warmup: unknown[];
    blocks: unknown[];
    cooldown: unknown[];
  } | null;
}

// ── System prompt builder ────────────────────────────────────

function buildSystemPrompt(body: RequestBody, weekStart: number, weekEnd: number, totalWeeks: number): string {
  const sections: string[] = [];

  const raceLabel = body.race_type === 'custom'
    ? `${body.race_distance_meters ?? 'unknown'}m race`
    : body.race_type.replace('_', ' ');

  sections.push(`You are PaceCue's AI running coach. You create structured, periodized training plans for runners preparing for races.

You are generating weeks ${weekStart} through ${weekEnd} of a ${totalWeeks}-week ${raceLabel} training plan.

The plan should follow standard periodization:
- **Base Building** (first ~30% of weeks): Build aerobic base with easy runs, gradually increasing volume
- **Build Phase** (next ~30%): Introduce tempo, speed work, and longer runs; increase intensity
- **Peak Phase** (next ~25%): Highest volume and intensity; race-specific workouts
- **Taper** (final ~15%): Reduce volume significantly while maintaining some intensity; fresh legs for race day

The final workout on race_date should be the race itself.

Each training day should have a specific workout with structured intervals matching the PaceCue format.
Rest days should have day_label "Rest Day" and null workout.

Keep workout descriptions concise (1-2 sentences) explaining the purpose of that day's session.`);

  // Runner profile
  const profile = body.profile;
  if (profile) {
    const parts: string[] = [];
    if (profile.experience_level) parts.push(`Experience: ${profile.experience_level}`);
    if (profile.typical_run_minutes) parts.push(`Typical run: ${profile.typical_run_minutes} min`);
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

  // Race details
  const raceParts: string[] = [];
  raceParts.push(`Race: ${raceLabel}`);
  raceParts.push(`Race date: ${body.race_date}`);
  if (body.goal_time_minutes) {
    const hrs = Math.floor(body.goal_time_minutes / 60);
    const mins = Math.round(body.goal_time_minutes % 60);
    raceParts.push(`Goal time: ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`);
  }
  raceParts.push(`Training days per week: ${body.days_per_week}`);
  raceParts.push(`Plan start: ${body.start_date}`);
  sections.push(`## Race Goal\n${raceParts.join("\n")}`);

  // Goals & preferences
  if (body.goals?.length) {
    sections.push(`## Goals\n${body.goals.map((g) => `- ${g}`).join("\n")}`);
  }
  if (body.preferences?.length) {
    sections.push(`## Preferences\n${body.preferences.map((p) => `- ${p}`).join("\n")}`);
  }

  // History
  if (body.history_summary) {
    sections.push(`## Runner's Recent Training History\n${body.history_summary}\n\nUse this to calibrate the starting volume and intensity appropriately.`);
  }

  // Output schema
  sections.push(`## Output Schema

Respond with ONLY a JSON object (no markdown fences, no extra text) matching:

{
  "weeks": [
    {
      "week_number": number,
      "theme": "string — phase name e.g. 'Base Building Week 1'",
      "workouts": [
        {
          "date": "YYYY-MM-DD",
          "day_label": "string — e.g. 'Easy Run', 'Long Run', 'Tempo', 'Intervals', 'Recovery', 'Rest Day', 'Race Day'",
          "description": "string — 1-2 sentence coaching note",
          "workout": WorkoutObject | null
        }
      ]
    }
  ]
}

WorkoutObject = {
  "name": "string — short name",
  "warmup": [RepeatBlock],
  "blocks": [RepeatBlock],
  "cooldown": [RepeatBlock]
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
- Rest days: day_label = "Rest Day", workout = null.
- Each week should have exactly ${body.days_per_week} training days plus rest days to fill the week.
- Dates must be real calendar dates starting from the plan start date.
- durationSeconds must be a positive integer.
- repeatCount must be a positive integer (1 = no repeat).
- warmup and cooldown can be empty [].
- blocks must have at least one RepeatBlock for non-rest days.`);

  return sections.join("\n\n");
}

// ── Compute total weeks and date ranges ──────────────────────

function weeksBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
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

    if (!body.race_type || !body.race_date || !body.start_date || !body.days_per_week) {
      return new Response(
        JSON.stringify({ error: "race_type, race_date, start_date, and days_per_week are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const totalWeeks = weeksBetween(body.start_date, body.race_date);
    const CHUNK_SIZE = 4;
    const allWeeks: PlanWeek[] = [];

    // Generate in chunks to stay within token limits
    for (let chunkStart = 1; chunkStart <= totalWeeks; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, totalWeeks);
      const systemPrompt = buildSystemPrompt(body, chunkStart, chunkEnd, totalWeeks);

      // Build a context message about what has already been generated
      const contextMessages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];

      if (allWeeks.length > 0) {
        const summary = allWeeks.map((w) =>
          `Week ${w.week_number} (${w.theme}): ${w.workouts.filter(wo => wo.workout).length} training days`
        ).join("\n");
        contextMessages.push({
          role: "user",
          content: `Previously generated plan summary:\n${summary}\n\nNow generate weeks ${chunkStart} to ${chunkEnd}.`,
        });
      } else {
        contextMessages.push({
          role: "user",
          content: `Generate weeks ${chunkStart} to ${chunkEnd} of the training plan.`,
        });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: contextMessages,
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
      if (result.weeks && Array.isArray(result.weeks)) {
        allWeeks.push(...result.weeks);
      }
    }

    // Build title
    const raceLabel = body.race_type === 'custom'
      ? 'Custom Race'
      : body.race_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const raceMonth = new Date(body.race_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const title = `${raceLabel} Training - ${raceMonth}`;

    return new Response(
      JSON.stringify({ title, weeks: allWeeks }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("generate-plan error:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
