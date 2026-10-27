/**
 * Opt-in Expo push registration for feature announcements.
 *
 * Permission is not requested on the first launch. On the second cold start,
 * if the system permission is still undetermined, we ask once. A "Not now"
 * is remembered. The General settings switch can enable or disable later.
 */

import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { getAnonymousId } from '../analytics/track';
import { supabase } from '../analytics/supabaseClient';
import { getUnseenAnnouncement } from '../announcements/announcementService';

const ENABLED_KEY = '@pacecue/push_enabled';
const TOKEN_KEY = '@pacecue/expo_push_token';
const LAUNCH_COUNT_KEY = '@pacecue/push_launch_count';
const DISMISSED_KEY = '@pacecue/push_prompt_dismissed';
const PROJECT_ID = '15ab975c-acf7-482d-8059-edfe8218ef58';
const CHANNEL_ID = 'announcements';

const ENVIRONMENTS = ['development', 'preview', 'production'] as const;

let promptStarted = false;
let lastOpenedNotificationId: string | null = null;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Android drops the banner when sound is disabled.
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

type PermissionSettings = Notifications.NotificationPermissionsStatus;

function isGranted(settings: PermissionSettings): boolean {
  if (Platform.OS === 'ios') {
    const status = settings.ios?.status;
    return (
      status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      status === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }
  return settings.granted;
}

function isDenied(settings: PermissionSettings): boolean {
  if (Platform.OS === 'ios') {
    return settings.ios?.status === Notifications.IosAuthorizationStatus.DENIED;
  }
  return settings.status === 'denied';
}

function isUndetermined(settings: PermissionSettings): boolean {
  if (Platform.OS === 'ios') {
    const status = settings.ios?.status;
    if (status == null) return settings.status === 'undetermined';
    return status === Notifications.IosAuthorizationStatus.NOT_DETERMINED;
  }
  return settings.status === 'undetermined';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'New features',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Announcements when SplitCue ships something new',
  });
}

function currentEnvironment(): string {
  const raw = Constants.expoConfig?.extra?.appVariant;
  return typeof raw === 'string' && ENVIRONMENTS.includes(raw as (typeof ENVIRONMENTS)[number])
    ? raw
    : 'production';
}

async function registerToken(): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureAndroidChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    PROJECT_ID;

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not get a push token.',
    };
  }

  await AsyncStorage.setItem(TOKEN_KEY, token);

  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_anonymous_user_id: await getAnonymousId(),
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    p_environment: currentEnvironment(),
    p_app_version: Constants.expoConfig?.version ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  await AsyncStorage.setItem(ENABLED_KEY, 'true');
  return { ok: true };
}

async function disableStoredToken(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await supabase.rpc('disable_push_token', { p_token: token });
}

/** Re-register when permission is already granted, or retry a failed opt-out. */
export async function refreshPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  const local = await AsyncStorage.getItem(ENABLED_KEY);
  if (local === 'false') {
    await disableStoredToken();
    return;
  }

  const settings = await Notifications.getPermissionsAsync();
  if (!isGranted(settings)) return;
  await registerToken();
}

export async function enablePushNotifications(): Promise<{
  ok: boolean;
  osDenied: boolean;
  error?: string;
}> {
  if (Platform.OS === 'web') {
    return { ok: false, osDenied: false, error: 'Notifications are not available here.' };
  }

  await ensureAndroidChannel();
  let settings = await Notifications.getPermissionsAsync();
  if (!isGranted(settings) && !isDenied(settings)) {
    settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
  }

  if (!isGranted(settings)) {
    return { ok: false, osDenied: isDenied(settings) };
  }

  const result = await registerToken();
  if (!result.ok) {
    return { ok: false, osDenied: false, error: result.error };
  }
  return { ok: true, osDenied: false };
}

export async function disablePushNotifications(): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
  await disableStoredToken();
}

export async function getPushToggleState(): Promise<{ enabled: boolean; osDenied: boolean }> {
  if (Platform.OS === 'web') return { enabled: false, osDenied: false };
  const [settings, local] = await Promise.all([
    Notifications.getPermissionsAsync(),
    AsyncStorage.getItem(ENABLED_KEY),
  ]);
  return {
    enabled: isGranted(settings) && local !== 'false',
    osDenied: isDenied(settings),
  };
}

/**
 * Ask once, on the second cold start, when the user has not decided yet.
 * Skipped when a what's-new alert is waiting, so the two alerts do not stack.
 */
export async function maybePromptForFeatureUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (promptStarted) return;
  promptStarted = true;

  const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
  const count = (raw ? Number.parseInt(raw, 10) : 0) + 1;
  await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(Number.isFinite(count) ? count : 1));

  if (await AsyncStorage.getItem(DISMISSED_KEY)) return;
  if (count < 2) return;

  const settings = await Notifications.getPermissionsAsync();
  if (!isUndetermined(settings)) return;
  if (await getUnseenAnnouncement()) return;

  Alert.alert('New features', 'Get a notification when we ship something new.', [
    {
      text: 'Not now',
      style: 'cancel',
      onPress: () => {
        AsyncStorage.setItem(DISMISSED_KEY, '1');
      },
    },
    {
      text: 'Enable',
      onPress: () => {
        enablePushNotifications();
      },
    },
  ]);
}

function urlFromNotification(response: Notifications.NotificationResponse | null): string | null {
  const url = response?.notification.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/') ? url : null;
}

/** Opens an in-app path attached to a notification, including cold starts. */
export function subscribeToNotificationOpens(onUrl: (url: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};

  const open = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (id && id === lastOpenedNotificationId) return;
    lastOpenedNotificationId = id || lastOpenedNotificationId;
    const url = urlFromNotification(response);
    Notifications.clearLastNotificationResponse();
    if (url) onUrl(url);
  };

  open(Notifications.getLastNotificationResponse());

  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
