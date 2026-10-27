'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPushNotification } from './actions';

export default function SendForm({
  productionCount,
  allCount,
}: {
  productionCount: number;
  allCount: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [includeNonProduction, setIncludeNonProduction] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const count = includeNonProduction ? allCount : productionCount;

  function review() {
    setError(null);
    setSuccess(null);
    if (!title.trim() || !body.trim()) {
      setError('Add a title and a message before sending.');
      return;
    }
    if (count === 0) {
      setError('No devices are opted in for this audience.');
      return;
    }
    setConfirming(true);
  }

  async function send() {
    setPending(true);
    setError(null);
    const result = await sendPushNotification({
      title,
      body,
      url,
      includeNonProduction,
    });
    setPending(false);
    if (!result.ok) {
      setError([result.error, result.warning].filter(Boolean).join(' ') || 'Could not send.');
      setConfirming(false);
    } else {
      const failed =
        result.errorCount > 0 ? ` ${result.errorCount} could not be delivered.` : '';
      setSuccess(
        `Sent to ${result.recipientCount} device${result.recipientCount === 1 ? '' : 's'}.${failed}`,
      );
      if (result.warning) setError(result.warning);
      setTitle('');
      setBody('');
      setUrl('');
      setConfirming(false);
    }
    router.refresh();
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (confirming) send();
        else review();
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm text-gray-300">Title</span>
        <input
          value={title}
          onChange={(event) => {
            setConfirming(false);
            setTitle(event.target.value);
          }}
          maxLength={120}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-gray-500"
          placeholder="New: GPS pace tracking"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-gray-300">Message</span>
        <textarea
          value={body}
          onChange={(event) => {
            setConfirming(false);
            setBody(event.target.value);
          }}
          maxLength={500}
          rows={4}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-gray-500"
          placeholder="Get real-time pace cues during your runs. Turn it on in Settings → Pace."
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-gray-300">In-app path (optional)</span>
        <input
          value={url}
          onChange={(event) => {
            setConfirming(false);
            setUrl(event.target.value);
          }}
          maxLength={200}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-gray-500"
          placeholder="/(tabs)/settings/pace"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={includeNonProduction}
          onChange={(event) => {
            setConfirming(false);
            setIncludeNonProduction(event.target.checked);
          }}
          className="mt-0.5"
        />
        <span>Include preview and development builds</span>
      </label>

      <p className="text-sm text-gray-400">
        {count} device{count === 1 ? '' : 's'} will be notified.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-200">
            Send “{title.trim()}” to {count} device{count === 1 ? '' : 's'}?
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-gray-950 disabled:opacity-60"
          >
            {pending ? 'Sending…' : 'Send'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300"
          >
            Back
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={count === 0}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-950 disabled:opacity-40"
        >
          Review send
        </button>
      )}
    </form>
  );
}
