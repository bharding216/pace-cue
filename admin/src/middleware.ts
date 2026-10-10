import { type NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase-middleware';
import { isAdminEmail } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow auth callback and login page through
  if (pathname.startsWith('/auth/callback') || pathname === '/login') {
    return response;
  }

  // No user -> redirect to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // User exists but not an admin -> sign out and redirect to login with error
  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
