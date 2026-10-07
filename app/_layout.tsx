import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '../src/constants/theme';
import { cleanupStaleLiveActivities } from '../src/hooks/useLiveActivity';
import {
  initInstallTimestamp,
  getUnseenAnnouncement,
  dismissAnnouncement,
} from '../src/announcements/announcementService';
import { track } from '../src/analytics/track';
import { decodeWorkoutLink } from '../src/sharing/shareWorkout';
import { saveWorkout } from '../src/workout/workoutStorage';

export default function RootLayout() {
  const router = useRouter();

  // End any Live Activities orphaned by a force-kill during a workout.
  useEffect(() => {
    cleanupStaleLiveActivities();
  }, []);

  // Track app open
  useEffect(() => {
    track('app_opened');
  }, []);

  // Handle incoming deep links for shared workout imports.
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes('workout/import')) return;

      const workout = decodeWorkoutLink(url);
      if (!workout) {
        Alert.alert('Invalid Link', 'Could not read the shared workout.');
        return;
      }

      Alert.alert(
        'Import Workout',
        `Add "${workout.name}" to your workouts?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              await saveWorkout(workout);
              track('workout_imported', {
                workout_id: workout.id,
                workout_name: workout.name,
              });
              router.push(`/workout/${workout.id}`);
            },
          },
        ],
      );
    };

    // Handle URL that launched the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Handle URLs while the app is already open (warm start)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [router]);

  // Show a single "what's new" alert to existing users on app open.
  useEffect(() => {
    (async () => {
      await initInstallTimestamp();
      const announcement = await getUnseenAnnouncement();
      if (announcement) {
        Alert.alert(announcement.title, announcement.body, [
          { text: 'Got it', onPress: () => dismissAnnouncement(announcement.id) },
        ]);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{ title: 'Edit Workout', presentation: 'modal' }}
        />
        <Stack.Screen
          name="workout/new"
          options={{ title: 'New Workout', presentation: 'modal' }}
        />
        <Stack.Screen
          name="workout/run/[id]"
          options={{
            title: '',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
