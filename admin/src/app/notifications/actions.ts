'use server';

import { revalidatePath } from 'next/cache';
import Expo, {
  type ExpoPushMessage,
  type ExpoPushTicket,
} from 'expo-server-sdk';
import { isAdminEmail } from '@/lib/admin-auth';
import { createAuthServerClient } from '@/lib/supabase-server-actions';
import { createServiceClient } from '@/lib/supabase-server';

const PRODUCTION = ['production'];
const ALL_ENVIRONMENTS = ['production', 'preview', 'development'];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SendPushResult = {
  ok: boolean;
  error?: string;
  warning?: string;
  recipientCount: number;
  errorCount: number;
};

export type CheckReceiptsResult = {
  ok: boolean;
  error?: string;
  disabledCount: number;
};

type StoredTicket = {
  token: string;
  ticketId: string | null;
  status: 'ok' | 'error';
  error: string | null;
};

async function assertAdmin(): Promise<string | null> {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return 'You are not allowed to send notifications.';
  }
  return null;
}

function tokenOf(message: ExpoPushMessage): string {
  return Array.isArray(message.to) ? message.to[0] : message.to;
}

function toStored(token: string, ticket: ExpoPushTicket): StoredTicket {
  if (ticket.status === 'ok') {
    return { token, ticketId: ticket.id, status: 'ok', error: null };
  }
  return {
    token,
    ticketId: null,
    status: 'error',
    error: ticket.details?.error ?? ticket.message,
  };
}

async function disableTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const { error } = await supabase
      .from('push_tokens')
      .update({ enabled: false, updated_at: now })
      .in('token', batch);
    if (error) throw new Error(error.message);
  }
}

function validateCopy(title: string, body: string, url: string): string | null {
  if (!title || title.length > 120) {
    return 'Title is required and must be 120 characters or fewer.';
  }
  if (!body || body.length > 500) {
    return 'Message is required and must be 500 characters or fewer.';
  }
  if (url && (!url.startsWith('/') || url.includes('://') || url.length > 200)) {
    return 'Link must be an in-app path, like /(tabs)/settings/about.';
  }
  return null;
}

export async function sendPushNotification(input: {
  title: string;
  body: string;
  url: string;
  includeNonProduction: boolean;
}): Promise<SendPushResult> {
  const denied = await assertAdmin();
  if (denied) return { ok: false, error: denied, recipientCount: 0, errorCount: 0 };

  const title = input.title.trim();
  const body = input.body.trim();
  const url = input.url.trim();
  const invalid = validateCopy(title, body, url);
  if (invalid) return { ok: false, error: invalid, recipientCount: 0, errorCount: 0 };

  const environments = input.includeNonProduction ? ALL_ENVIRONMENTS : PRODUCTION;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('enabled', true)
    .in('environment', environments);

  if (error) {
    return { ok: false, error: error.message, recipientCount: 0, errorCount: 0 };
  }

  const tokens = (data ?? [])
    .map((row: { token: string }) => row.token)
    .filter((token: string) => Expo.isExpoPushToken(token));

  if (tokens.length === 0) {
    return {
      ok: false,
      error: 'No devices are opted in for this audience.',
      recipientCount: 0,
      errorCount: 0,
    };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default',
    channelId: 'announcements',
    data: url ? { url } : {},
  }));

  const expo = new Expo();
  const stored: StoredTicket[] = [];

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      ticketChunk.forEach((ticket, index) => {
        stored.push(toStored(tokenOf(chunk[index]), ticket));
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Expo push request failed.';
      chunk.forEach((item) => {
        stored.push({
          token: tokenOf(item),
          ticketId: null,
          status: 'error',
          error: message,
        });
      });
    }
  }

  const dead = stored
    .filter((ticket) => ticket.error === 'DeviceNotRegistered')
    .map((ticket) => ticket.token);
  try {
    await disableTokens(dead);
  } catch (e) {
    // The send already happened. Keep going so the log is written.
    console.error(e);
  }

  const errorCount = stored.filter((ticket) => ticket.status === 'error').length;
  const { error: insertError } = await supabase.from('push_sends').insert({
    title,
    body,
    url: url || null,
    environments,
    recipient_count: stored.length,
    error_count: errorCount,
    tickets: stored,
  });

  revalidatePath('/notifications');

  const allFailed = errorCount === stored.length;
  const firstError = stored.find((ticket) => ticket.error)?.error;

  return {
    ok: !allFailed,
    error: allFailed ? firstError ?? 'Every notification failed.' : undefined,
    warning: insertError
      ? 'The notification was sent, but the send log could not be saved.'
      : undefined,
    recipientCount: stored.length,
    errorCount,
  };
}

export async function checkPushReceipts(sendId: string): Promise<CheckReceiptsResult> {
  const denied = await assertAdmin();
  if (denied) return { ok: false, error: denied, disabledCount: 0 };
  if (!UUID_RE.test(sendId)) {
    return { ok: false, error: 'Unknown send.', disabledCount: 0 };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('push_sends')
    .select('tickets')
    .eq('id', sendId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, disabledCount: 0 };
  if (!data) return { ok: false, error: 'Unknown send.', disabledCount: 0 };

  const tickets = (data.tickets ?? []) as StoredTicket[];
  const receiptIds = tickets.flatMap((ticket) => (ticket.ticketId ? [ticket.ticketId] : []));
  if (receiptIds.length === 0) {
    return { ok: false, error: 'This send has no receipts to check.', disabledCount: 0 };
  }

  const expo = new Expo();
  const dead: string[] = [];

  try {
    for (const chunk of expo.chunkPushNotificationReceiptIds(receiptIds)) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
          const match = tickets.find((ticket) => ticket.ticketId === id);
          if (match) dead.push(match.token);
        }
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not fetch receipts.',
      disabledCount: 0,
    };
  }

  try {
    await disableTokens(dead);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not disable unregistered devices.',
      disabledCount: 0,
    };
  }

  const { error: updateError } = await supabase
    .from('push_sends')
    .update({ receipts_checked_at: new Date().toISOString() })
    .eq('id', sendId);

  revalidatePath('/notifications');

  if (updateError) {
    return {
      ok: true,
      error: 'Unregistered devices were disabled, but the send log was not updated.',
      disabledCount: dead.length,
    };
  }

  return { ok: true, disabledCount: dead.length };
}
