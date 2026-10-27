'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkPushReceipts } from './actions';

export default function CheckDeliveryButton({ sendId }: { sendId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const result = await checkPushReceipts(sendId);
    setPending(false);
    if (!result.ok) {
      setFailed(true);
      setMessage(result.error ?? 'Could not check receipts.');
      return;
    }
    setFailed(Boolean(result.error));
    setMessage(
      result.error ??
        (result.disabledCount > 0
          ? `Disabled ${result.disabledCount} unregistered device${result.disabledCount === 1 ? '' : 's'}.`
          : 'Receipts checked.'),
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-60"
      >
        {pending ? 'Checking…' : 'Check delivery'}
      </button>
      {message && (
        <p className={`text-xs ${failed ? 'text-red-400' : 'text-gray-400'}`}>{message}</p>
      )}
    </div>
  );
}
