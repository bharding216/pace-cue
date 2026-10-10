import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieEntry = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client that reads auth cookies.
 * Used in Server Components and Server Actions to get the current session.
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieEntry[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignored in Server Components (read-only context).
          }
        },
      },
    },
  );
}
