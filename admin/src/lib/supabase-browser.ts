import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client for auth only.
 * Uses the anon key — safe to expose to the client.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
