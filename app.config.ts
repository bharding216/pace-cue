import type { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const BUNDLE_ID = IS_DEV
  ? 'com.toddly.runningintervals.dev'
  : 'com.toddly.runningintervals';
const APP_GROUP = `group.${BUNDLE_ID}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  name: IS_DEV ? 'PaceCue Dev Build' : 'PaceCue',
  slug: 'pace-cue',
  version: '1.4.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: IS_DEV ? 'pacecue-dev' : 'pacecue',
  ios: {
    supportsTablet: false,
    bundleIdentifier: BUNDLE_ID,
    entitlements: {
      'com.apple.security.application-groups': [APP_GROUP],
    },
    infoPlist: {
      UIBackgroundModes: ['audio'],
      NSMicrophoneUsageDescription: 'PaceCue does not use the microphone.',
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
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
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
