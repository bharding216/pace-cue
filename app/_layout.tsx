import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/constants/theme';
import { cleanupStaleLiveActivities } from '../src/hooks/useLiveActivity';

export default function RootLayout() {
  // End any Live Activities orphaned by a force-kill during a workout.
  useEffect(() => {
    cleanupStaleLiveActivities();
  }, []);

  return (
    <>
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
    </>
  );
}
