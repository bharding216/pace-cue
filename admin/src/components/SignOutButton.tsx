'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
    >
      Sign out
    </button>
  );
}
