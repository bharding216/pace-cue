/**
 * Device, build, locale and power details for analytics.
 *
 * expo-device, expo-application, expo-battery and expo-localization are loaded
 * with a guarded require. OTA updates also reach binaries built before these
 * native modules were added, and importing a missing native module throws.
 */

import { Appearance, PixelRatio, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

function optionalModule<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}

const Device = optionalModule(() => require('expo-device') as typeof import('expo-device'));
const Application = optionalModule(
  () => require('expo-application') as typeof import('expo-application'),
);
const Battery = optionalModule(() => require('expo-battery') as typeof import('expo-battery'));
const Localization = optionalModule(
  () => require('expo-localization') as typeof import('expo-localization'),
);

function read<T>(get: () => T | null | undefined): T | null {
  try {
    return get() ?? null;
  } catch {
    return null;
  }
}

export function devicePlatform(): 'ios' | 'android' | null {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
}

/** OS version, from expo-device when present, else React Native's constant. */
export function deviceOsVersion(): string | null {
  const version = read(() => Device?.osVersion) ?? read(() => String(Platform.Version));
  return version || null;
}

export function currentUpdateId(): string | null {
  return read(() => Updates.updateId);
}

/** Small set of fields stored on every event row, since they change between sessions. */
export function eventDeviceFields(): {
  platform: string | null;
  os_version: string | null;
  update_id: string | null;
} {
  return {
    platform: devicePlatform(),
    os_version: deviceOsVersion(),
    update_id: currentUpdateId(),
  };
}

/** Values that can be read synchronously and rarely change. */
export function staticDeviceInfo() {
  const locale = read(() => Localization?.getLocales()[0]);
  const calendar = read(() => Localization?.getCalendars()[0]);

  return {
    platform: devicePlatform(),
    os_version: deviceOsVersion(),
    os_build_id: read(() => Device?.osBuildId),
    model_name: read(() => Device?.modelName),
    model_id: read(() => Device?.modelId) ?? read(() => Device?.designName),
    manufacturer: read(() => Device?.manufacturer),
    device_year_class: read(() => Device?.deviceYearClass),
    total_memory_bytes: read(() => Device?.totalMemory),
    is_physical_device: read(() => Device?.isDevice),

    environment: (Constants.expoConfig?.extra?.appVariant as string) ?? 'production',
    app_version: Constants.expoConfig?.version ?? null,
    native_app_version: read(() => Application?.nativeApplicationVersion),
    native_build_version: read(() => Application?.nativeBuildVersion),
    runtime_version: read(() => Updates.runtimeVersion),
    update_id: currentUpdateId(),
    update_channel: read(() => Updates.channel),
    is_embedded_launch: read(() => Updates.isEmbeddedLaunch),

    locale: locale?.languageTag ?? read(() => Intl.DateTimeFormat().resolvedOptions().locale),
    timezone: calendar?.timeZone ?? read(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    measurement_system: locale?.measurementSystem ?? null,
    uses_24h_clock: calendar?.uses24hourClock ?? null,
    font_scale: read(() => Math.round(PixelRatio.getFontScale() * 100) / 100),
    color_scheme: read(() => Appearance.getColorScheme()),
  };
}

export async function getInstallationTime(): Promise<string | null> {
  try {
    const date = await Application?.getInstallationTimeAsync();
    return date ? date.toISOString() : null;
  } catch {
    return null;
  }
}

/** Google Play install referrer. Android only, and only for Play installs. */
export async function getInstallReferrer(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    return (await Application?.getInstallReferrerAsync()) ?? null;
  } catch {
    return null;
  }
}

export interface PowerSnapshot {
  /** 0..1, or null when the device does not report it (simulators, old binaries). */
  batteryLevel: number | null;
  charging: boolean | null;
  lowPowerMode: boolean | null;
}

export async function getPowerSnapshot(): Promise<PowerSnapshot> {
  const empty: PowerSnapshot = { batteryLevel: null, charging: null, lowPowerMode: null };
  if (!Battery) return empty;
  try {
    const { batteryLevel, batteryState, lowPowerMode } = await Battery.getPowerStateAsync();
    return {
      batteryLevel: batteryLevel >= 0 ? Math.round(batteryLevel * 100) / 100 : null,
      charging:
        batteryState === Battery.BatteryState.UNKNOWN
          ? null
          : batteryState !== Battery.BatteryState.UNPLUGGED,
      lowPowerMode,
    };
  } catch {
    return empty;
  }
}
