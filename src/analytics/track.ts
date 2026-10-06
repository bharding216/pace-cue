/**
 * Lightweight anonymous event tracking.
 *
 * Usage:
 *   track('workout_started', { workout_id: '...', interval_count: 6 });
 *
 * Events are fire-and-forget — failures are silently swallowed so
 * analytics never crash the app or block the UI.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

const ANONYMOUS_ID_KEY = '@pacecue/anonymous_id';

/** In-memory cache so we only hit AsyncStorage once per session. */
let cachedId: string | null = null;

/** Generate a simple UUID v4. */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Get or create a persistent anonymous user ID.
 * Created once on first call, then cached in memory + AsyncStorage.
 */
async function getAnonymousId(): Promise<string> {
  if (cachedId) return cachedId;

  try {
    const stored = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }
  } catch {}

  const newId = uuid();
  cachedId = newId;

  try {
    await AsyncStorage.setItem(ANONYMOUS_ID_KEY, newId);
  } catch {}

  return newId;
}

/**
 * Fire an analytics event. Non-blocking, never throws.
 */
export function track(
  eventName: string,
  metadata?: Record<string, unknown>,
): void {
  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const environment = (Constants.expoConfig?.extra?.appVariant as string) ?? 'production';

  getAnonymousId()
    .then((anonymousUserId) =>
      supabase.from('events').insert({
        anonymous_user_id: anonymousUserId,
        event_name: eventName,
        app_version: appVersion,
        environment,
        metadata: metadata ?? {},
      }),
    )
    .catch(() => {
      // Analytics should never crash the app.
    });
}
