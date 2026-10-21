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
  weekly_mileage?: number;
  longest_recent_run_minutes?: number;
  max_workout_minutes?: number;
  preferred_days?: string[];
  cross_training?: string[];
}

interface RequestBody {
  profile?: RunnerProfile;
  goals?: string[];
  preferences?: string[];
  limitations?: string[];
  race_type: string;
  race_distance_meters?: number | null;
  race_date: string;
  goal_time_minutes?: number | null;
  start_date: string;
  days_per_week: number;
  history_summary?: string | null;
}

// ── Plan dimensions ──────────────────────────────────────────

interface PlanDimensions {
  totalWeeks: number;
  lastWeekDays: number;
}

function planDimensions(startDate: string, endDate: string): PlanDimensions {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remaining = totalDays - fullWeeks * 7;
  return {
    totalWeeks: remaining > 0 ? fullWeeks + 1 : Math.max(1, fullWeeks),
    lastWeekDays: remaining > 0 ? remaining : 7,
  };
}

// ── System prompt ────────────────────────────────────────────

function buildSystemPrompt(body: RequestBody, dims: PlanDimensions): string {
  const sections: string[] = [];

  const raceLabel = body.race_type === 'custom'
    ? `${body.race_distance_meters ?? 'unknown'}m race`
    : body.race_type.replace('_', ' ');

  sections.push(`You are PaceCue's AI running coach creating a ${dims.totalWeeks}-week ${raceLabel} training plan OUTLINE.

Follow standard periodization: Base (~30%), Build (~30%), Peak (~25%), Taper (~15%).

OUTLINE only — no detailed workout structures. Just day labels and short coaching notes.`);

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
    if (profile.weekly_mileage) parts.push(`Weekly mileage: ~${profile.weekly_mileage} mi`);
    if (profile.longest_recent_run_minutes) parts.push(`Longest recent run: ${profile.longest_recent_run_minutes} min`);
    if (profile.max_workout_minutes) parts.push(`Max workout: ${profile.max_workout_minutes} min`);
    if (parts.length > 0) {
      sections.push(`## Runner\n${parts.join(" | ")}`);
    }
    if (profile.cross_training?.length) {
      sections.push(`## Cross Training\n${profile.cross_training.join(", ")}\nAccount for cross-training load when planning recovery.`);
    }
    if (profile.preferred_days?.length) {
      sections.push(`## Preferred Days\n${profile.preferred_days.join(", ")}\nPlace rest days on non-preferred days when possible.`);
    }
  }

  // Race details
  const raceParts: string[] = [];
  raceParts.push(`Race: ${raceLabel} on ${body.race_date}`);
  if (body.goal_time_minutes) {
    const hrs = Math.floor(body.goal_time_minutes / 60);
    const mins = Math.round(body.goal_time_minutes % 60);
    raceParts.push(`Goal: ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`);
  }
  raceParts.push(`${body.days_per_week} training days/week, start ${body.start_date}`);
  sections.push(`## Race\n${raceParts.join(" | ")}`);

  if (body.goals?.length) {
    sections.push(`## Goals\n${body.goals.join(", ")}`);
  }
  if (body.preferences?.length) {
    sections.push(`## Preferences\n${body.preferences.join(", ")}`);
  }
  if (body.limitations?.length) {
    sections.push(`## Limitations\n${body.limitations.join(", ")}\nIMPORTANT: Respect these — adjust volume, intensity, and rest accordingly.`);
  }
  if (body.history_summary) {
    sections.push(`## History\n${body.history_summary}\nCalibrate starting volume accordingly.`);
  }

  // Compact output schema — dates are assigned server-side, not by the model
  sections.push(`## Output — COMPACT FORMAT (dates assigned automatically)

JSON only, no markdown fences:

{
  "weeks": [
    {
      "theme": "phase name, e.g. Base Building 1",
      "miles": number,
      "days": [
        ["Easy Run", "30 min conversational effort"],
        [null],
        ["Tempo", "20 min at threshold pace"],
        [null],
        ["Easy Run", "30 min easy"],
        ["Long Run", "60 min relaxed"],
        [null]
      ]
    }
  ]
}

Rules:
- Training day = ["label", "short description"]. Rest day = [null].
- Labels: Easy Run, Long Run, Tempo, Intervals, Recovery, Fartlek, Race Day, etc.
- Weeks 1–${dims.totalWeeks > 1 ? dims.totalWeeks - 1 : 1}: exactly 7 entries each.${dims.totalWeeks > 1 ? `\n- Week ${dims.totalWeeks}: exactly ${dims.lastWeekDays} entries. Last entry must be ["Race Day", "Race day! Trust your training."].` : ''}
- ${body.days_per_week} training days per full week; rest days fill remaining slots.
- miles = reasonable weekly mileage for runner's level and phase.
- Keep descriptions to one short sentence.`);

  return sections.join("\n\n");
}

// ── Expand compact outline into dated format ─────────────────

interface CompactWeek {
  theme: string;
  miles: number;
  days: ([string, string] | [null])[];
}

function expandCompactOutline(
  compactWeeks: CompactWeek[],
  startDate: string,
) {
  const start = new Date(startDate + 'T00:00:00');

  return compactWeeks.map((week, weekIdx) => ({
    week_number: weekIdx + 1,
    theme: week.theme,
    total_miles_target: week.miles,
    days: week.days.map((day, dayIdx) => {
      const d = new Date(start);
      d.setDate(d.getDate() + weekIdx * 7 + dayIdx);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!day[0]) {
        return { date: dateStr, day_label: 'Rest Day', description: null };
      }
      return { date: dateStr, day_label: day[0], description: day[1] ?? null };
    }),
  }));
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

    const dims = planDimensions(body.start_date, body.race_date);
    const systemPrompt = buildSystemPrompt(body, dims);

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
          { role: "user", content: `Generate the ${dims.totalWeeks}-week plan outline.` },
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

    const compact = JSON.parse(content);

    // Expand compact tuples into dated day objects (same shape the client expects)
    const weeks = expandCompactOutline(compact.weeks, body.start_date);

    // Build title
    const raceLabel = body.race_type === 'custom'
      ? 'Custom Race'
      : body.race_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const raceMonth = new Date(body.race_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const title = `${raceLabel} Training - ${raceMonth}`;

    return new Response(
      JSON.stringify({ title, weeks }),
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
