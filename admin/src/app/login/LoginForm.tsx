'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

type Step = 'email' | 'code';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setStep('code');
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserSupabaseClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push('/');
    router.refresh();
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

      {step === 'email' && (
        <form onSubmit={handleSendCode} className="space-y-4">
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
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Sign-In Code'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <p className="text-sm text-gray-400">
            Enter the 6-digit code sent to <span className="text-gray-200">{email}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-center text-2xl font-mono tracking-[0.5em] text-gray-100 placeholder-gray-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Use a different email
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}
    </>
  );
}
