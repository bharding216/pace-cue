/**
 * Location permission helpers for GPS pace tracking.
 *
 * Foreground access is requested from the pre-run screen, never after the
 * workout timer has started. Background ("Always") access is offered once,
 * on the finish screen after a run that used GPS.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const BACKGROUND_OFFER_DISMISSED_KEY = '@pacecue/background_location_offer_dismissed';

/** `askable`: a system prompt can still be shown. `blocked`: only Settings can change it. */
export type LocationAccess = 'granted' | 'askable' | 'blocked';

function toAccess(response: Location.PermissionResponse): LocationAccess {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'askable' : 'blocked';
}

export async function getForegroundLocationAccess(): Promise<LocationAccess> {
  return toAccess(await Location.getForegroundPermissionsAsync());
}

export async function requestForegroundLocationAccess(): Promise<LocationAccess> {
  return toAccess(await Location.requestForegroundPermissionsAsync());
}

export async function shouldOfferBackgroundLocation(): Promise<boolean> {
  if (await AsyncStorage.getItem(BACKGROUND_OFFER_DISMISSED_KEY)) return false;
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  const background = await Location.getBackgroundPermissionsAsync();
  return !background.granted && background.canAskAgain;
}

export async function requestBackgroundLocationAccess(): Promise<boolean> {
  await AsyncStorage.setItem(BACKGROUND_OFFER_DISMISSED_KEY, '1');
  const { granted } = await Location.requestBackgroundPermissionsAsync();
  return granted;
}

export async function dismissBackgroundLocationOffer(): Promise<void> {
  await AsyncStorage.setItem(BACKGROUND_OFFER_DISMISSED_KEY, '1');
}
