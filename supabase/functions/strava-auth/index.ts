/**
 * strava-auth — Supabase Edge Function
 *
 * Handles the Strava OAuth 2.0 flow:
 *   GET  → returns the Strava authorize URL for the client to open
 *   POST → exchanges an authorization code for tokens and stores them
 *   DELETE → revokes the token and removes the connection
 *
 * Deploy:  supabase functions deploy strava-auth
 * Secrets: supabase secrets set STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=...
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

/** Extract the authenticated user ID from the request's Authorization header. */
async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user.id;
}

/** Service-role Supabase client for DB writes that bypass RLS. */
function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    // ── GET: Return the Strava OAuth authorize URL ──────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) {
        return errorResponse("redirect_uri query param is required", 400);
      }

      const params = new URLSearchParams({
        client_id: STRAVA_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        approval_prompt: "auto",
        scope: "activity:write",
        state: userId,
      });

      const authorizeUrl = `https://www.strava.com/oauth/authorize?${params}`;
      return jsonResponse({ url: authorizeUrl });
    }

    // ── POST: Exchange authorization code for tokens ────────
    if (req.method === "POST") {
      const body = await req.json();
      const { code } = body;

      if (!code) {
        return errorResponse("code is required", 400);
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(
        "https://www.strava.com/oauth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
          }),
        },
      );

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        console.error("Strava token exchange failed:", tokenResponse.status, err);
        return errorResponse("Failed to exchange authorization code", 502);
      }

      const tokenData = await tokenResponse.json();
      const {
        access_token,
        refresh_token,
        expires_at,
        athlete,
      } = tokenData;

      if (!access_token || !refresh_token) {
        return errorResponse("Invalid token response from Strava", 502);
      }

      const athleteName = athlete
        ? [athlete.firstname, athlete.lastname].filter(Boolean).join(" ")
        : null;
      const stravaAthleteId = athlete?.id ?? 0;

      // Upsert the connection
      const db = adminClient();
      const { error: dbError } = await db
        .from("strava_connections")
        .upsert(
          {
            user_id: userId,
            strava_athlete_id: stravaAthleteId,
            access_token,
            refresh_token,
            token_expires_at: new Date(expires_at * 1000).toISOString(),
            athlete_name: athleteName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (dbError) {
        console.error("DB upsert error:", JSON.stringify(dbError));
        return errorResponse(`Failed to save Strava connection: ${dbError.message}`, 500);
      }

      return jsonResponse({
        connected: true,
        athleteName,
        stravaAthleteId,
      });
    }

    // ── DELETE: Revoke token and remove connection ──────────
    if (req.method === "DELETE") {
      const db = adminClient();

      // Load the current token to revoke it
      const { data: conn } = await db
        .from("strava_connections")
        .select("access_token")
        .eq("user_id", userId)
        .single();

      if (conn?.access_token) {
        // Best-effort revoke — don't fail if Strava is unreachable
        try {
          await fetch("https://www.strava.com/oauth/deauthorize", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `access_token=${conn.access_token}`,
          });
        } catch (e) {
          console.warn("Strava deauthorize failed (non-fatal):", e);
        }
      }

      // Delete the row
      await db
        .from("strava_connections")
        .delete()
        .eq("user_id", userId);

      return jsonResponse({ disconnected: true });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("strava-auth error:", err);
    return errorResponse(message);
  }
});
