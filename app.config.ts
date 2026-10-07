import type { ExpoConfig, ConfigContext } from 'expo/config';

const VARIANT = process.env.APP_VARIANT; // 'development' | 'preview' | undefined (production)
const IS_DEV = VARIANT === 'development';
const IS_PREVIEW = VARIANT === 'preview';
const BUNDLE_ID = IS_DEV
  ? 'com.toddly.runningintervals.dev'
  : IS_PREVIEW
    ? 'com.toddly.runningintervals.preview'
    : 'com.toddly.runningintervals';
// Preview reuses the production App Group (the preview-specific one can't be created in Apple)
const APP_GROUP = IS_DEV
  ? 'group.com.toddly.runningintervals.dev'
  : 'group.com.toddly.runningintervals';

const APP_NAME = IS_DEV
  ? 'PaceCue Dev Build'
  : IS_PREVIEW
    ? 'PaceCue Preview Build'
    : 'PaceCue';

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: APP_NAME,
  slug: 'pace-cue',
  version: '1.6.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: IS_DEV ? 'pacecue-dev' : IS_PREVIEW ? 'pacecue-preview' : 'pacecue',
  ios: {
    supportsTablet: false,
    bundleIdentifier: BUNDLE_ID,
    entitlements: {
      'com.apple.security.application-groups': [APP_GROUP],
    },
    infoPlist: {
      UIBackgroundModes: ['audio', 'location'],
      NSMicrophoneUsageDescription: 'PaceCue does not use the microphone.',
      NSLocationWhenInUseUsageDescription:
        'PaceCue uses your location to calculate your running pace in real time.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'PaceCue uses your location in the background to track pace while your screen is locked.',
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#181818',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: BUNDLE_ID,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow PaceCue to track your running pace in the background.',
        locationWhenInUsePermission:
          'Allow PaceCue to track your running pace.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: '#181818',
        dark: {
          image: './assets/splash-icon.png',
          backgroundColor: '#181818',
        },
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: false,
        enableBackgroundPlayback: true,
      },
    ],
    [
      'expo-widgets',
      {
        bundleIdentifier: `${BUNDLE_ID}.widgets`,
        groupIdentifier: APP_GROUP,
      },
    ],
  ],
  updates: {
    url: 'https://u.expo.dev/15ab975c-acf7-482d-8059-edfe8218ef58',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: VARIANT ?? 'production',
    router: {},
    eas: {
      build: {
        experimental: {
          ios: {
            appExtensions: [
              {
                targetName: 'ExpoWidgetsTarget',
                bundleIdentifier: `${BUNDLE_ID}.widgets`,
                entitlements: {
                  'com.apple.security.application-groups': [APP_GROUP],
                },
              },
            ],
          },
        },
      },
      projectId: '15ab975c-acf7-482d-8059-edfe8218ef58',
    },
  },
});
