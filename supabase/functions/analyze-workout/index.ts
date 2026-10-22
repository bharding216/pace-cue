/**
 * analyze-workout — Supabase Edge Function
 *
 * Evaluates a completed workout against its plan prescription
 * and recent training history. Returns a structured performance
 * analysis and optional plan adjustment recommendations.
 *
 * Deploy:  supabase functions deploy analyze-workout
 * Secrets: supabase secrets set OPENAI_API_KEY=sk-...
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  completed_workout: {
    name: string;
    total_duration_ms: number;
    total_distance_meters?: number | null;
    splits?: { pace_min_per_mile: number; distance_meters: number }[];
    average_pace_min_per_mile?: number | null;
  };
  planned_workout?: {
    day_label: string;
    description?: string;
    workout_data?: unknown;
  } | null;
  profile?: {
    experience_level?: string;
    easy_pace?: number;
    fast_pace?: number;
  } | null;
  recent_history_summary?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();

    const systemPrompt = `You are a running coach AI for the PaceCue app. Analyze the completed workout and provide a structured performance assessment.

You MUST respond with valid JSON matching this exact schema:
{
  "performance_rating": "on_target" | "exceeded" | "struggled" | "incomplete",
  "fatigue_signal": "normal" | "elevated" | "concerning",
  "key_observations": ["string", "string"],  // 2-3 bullet points
  "recommendation": "maintain" | "increase" | "decrease" | "rest",
  "coach_message": "string",  // 2-3 sentence personalized feedback
  "plan_update": {
    "requires_changes": boolean,
    "reason": "string",
    "workout_changes": [
      {
        "date": "YYYY-MM-DD",
        "action": "update" | "skip",
        "day_label": "string",
        "description": "string"
      }
    ]
  }
}

Guidelines:
- Be encouraging but honest about performance
- If the runner completed the workout at target, say "maintain"
- If they exceeded targets comfortably, consider "increase" for future workouts
- If they struggled (pace faded, couldn't complete), suggest "decrease"
- Only recommend plan changes when there's a meaningful signal, not after every workout
- A successful workout on target should usually result in requires_changes: false
- For fatigue signals, look for pace fade across intervals, much slower than targets, or very short duration`;

    const userContent = `Analyze this completed workout:

COMPLETED WORKOUT:
- Name: ${body.completed_workout.name}
- Duration: ${Math.round(body.completed_workout.total_duration_ms / 60000)} minutes
${body.completed_workout.total_distance_meters ? `- Distance: ${(body.completed_workout.total_distance_meters / 1609.344).toFixed(2)} miles` : ''}
${body.completed_workout.average_pace_min_per_mile ? `- Average pace: ${Math.floor(body.completed_workout.average_pace_min_per_mile)}:${Math.round((body.completed_workout.average_pace_min_per_mile % 1) * 60).toString().padStart(2, '0')}/mi` : ''}
${body.completed_workout.splits?.length ? `- Splits: ${body.completed_workout.splits.map((s, i) => `Split ${i + 1}: ${Math.floor(s.pace_min_per_mile)}:${Math.round((s.pace_min_per_mile % 1) * 60).toString().padStart(2, '0')}/mi`).join(', ')}` : ''}

${body.planned_workout ? `PLANNED WORKOUT:
- Label: ${body.planned_workout.day_label}
- Description: ${body.planned_workout.description || 'N/A'}` : 'No planned workout prescription available.'}

${body.profile ? `RUNNER PROFILE:
- Experience: ${body.profile.experience_level || 'unknown'}
- Easy pace: ${body.profile.easy_pace ? `${Math.floor(body.profile.easy_pace)}:${Math.round((body.profile.easy_pace % 1) * 60).toString().padStart(2, '0')}/mi` : 'unknown'}
- Fast pace: ${body.profile.fast_pace ? `${Math.floor(body.profile.fast_pace)}:${Math.round((body.profile.fast_pace % 1) * 60).toString().padStart(2, '0')}/mi` : 'unknown'}` : ''}

${body.recent_history_summary ? `RECENT TRAINING CONTEXT:\n${body.recent_history_summary}` : ''}`;

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
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI error:", errorBody);
      return new Response(
        JSON.stringify({ error: "Failed to analyze workout" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-workout error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
