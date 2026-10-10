'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    setSubmitted(true);
  }

  return (
    <>
      {urlError === 'unauthorized' && (
        <div className="rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-200">
          Your email is not authorized to access this dashboard.
        </div>
      )}

      {urlError === 'auth_failed' && (
        <div className="rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-200">
          Authentication failed. Please try again.
        </div>
      )}

      {submitted ? (
        <div className="rounded-lg bg-green-900/50 border border-green-700 p-4 text-center text-sm text-green-200">
          Check your email for a magic link to sign in.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Send Magic Link
          </button>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </form>
      )}
    </>
  );
}
