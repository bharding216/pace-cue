/**
 * generate-plan-outline — Supabase Edge Function
 *
 * Fast single-call plan generator that returns only week-level data:
 * themes, volume targets, day labels, and coaching descriptions.
 * No detailed workout objects (intervals, warmup, blocks, cooldown).
 *
 * Detailed workouts are generated on-demand by `generate-workouts`.
 *
 * Deploy:  supabase functions deploy generate-plan-outline
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

interface RequestBody {
  profile?: RunnerProfile;
  goals?: string[];
  preferences?: string[];
  race_type: string;
  race_distance_meters?: number | null;
  race_date: string;
  goal_time_minutes?: number | null;
  start_date: string;
  days_per_week: number;
  history_summary?: string | null;
}

// ── System prompt ────────────────────────────────────────────

function buildSystemPrompt(body: RequestBody, totalWeeks: number): string {
  const sections: string[] = [];

  const raceLabel = body.race_type === 'custom'
    ? `${body.race_distance_meters ?? 'unknown'}m race`
    : body.race_type.replace('_', ' ');

  sections.push(`You are PaceCue's AI running coach. You create structured, periodized training plan OUTLINES for runners preparing for races.

You are generating a ${totalWeeks}-week ${raceLabel} training plan outline.

The plan should follow standard periodization:
- **Base Building** (first ~30% of weeks): Build aerobic base with easy runs, gradually increasing volume
- **Build Phase** (next ~30%): Introduce tempo, speed work, and longer runs; increase intensity
- **Peak Phase** (next ~25%): Highest volume and intensity; race-specific workouts
- **Taper** (final ~15%): Reduce volume significantly while maintaining some intensity; fresh legs for race day

The final workout on race_date should be the race itself.

IMPORTANT: You are generating an OUTLINE only. Do NOT include detailed workout structures (no intervals, warmup blocks, or cooldown blocks). Just provide day labels and short coaching descriptions. Detailed workouts will be generated separately when the runner is ready for them.

Rest days should have day_label "Rest Day" and a null description.

Keep workout descriptions concise (1-2 sentences) explaining the purpose of that day's session.`);

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

  // Output schema — outline only, no workout objects
  sections.push(`## Output Schema

Respond with ONLY a JSON object (no markdown fences, no extra text) matching:

{
  "weeks": [
    {
      "week_number": number,
      "theme": "string — phase name e.g. 'Base Building Week 1'",
      "total_miles_target": number — estimated total weekly mileage,
      "days": [
        {
          "date": "YYYY-MM-DD",
          "day_label": "string — e.g. 'Easy Run', 'Long Run', 'Tempo', 'Intervals', 'Recovery', 'Rest Day', 'Race Day'",
          "description": "string — 1-2 sentence coaching note (null for rest days)"
        }
      ]
    }
  ]
}

Rules:
- Do NOT include workout objects, intervals, warmup/cooldown blocks, or any detailed workout structure.
- Rest days: day_label = "Rest Day", description = null.
- Each week should have exactly ${body.days_per_week} training days plus rest days to fill the week (7 days total).
- Dates must be real calendar dates starting from the plan start date.
- total_miles_target should be a reasonable weekly mileage for the runner's experience level and training phase.
- The final day (race_date) should be the race itself with day_label "Race Day".`);

  return sections.join("\n\n");
}

// ── Compute total weeks ──────────────────────────────────────

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
    const systemPrompt = buildSystemPrompt(body, totalWeeks);

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
          { role: "user", content: `Generate the full ${totalWeeks}-week training plan outline.` },
        ],
        temperature: 0.7,
        max_tokens: 16384,
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

    // Build title
    const raceLabel = body.race_type === 'custom'
      ? 'Custom Race'
      : body.race_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const raceMonth = new Date(body.race_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const title = `${raceLabel} Training - ${raceMonth}`;

    return new Response(
      JSON.stringify({ title, weeks: result.weeks }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("generate-plan-outline error:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
