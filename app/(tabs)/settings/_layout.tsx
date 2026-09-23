import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="audio" options={{ title: 'Audio & Cues' }} />
      <Stack.Screen name="general" options={{ title: 'General' }} />
      <Stack.Screen name="data" options={{ title: 'Backup & Restore' }} />
      <Stack.Screen name="about" options={{ title: 'About & Feedback' }} />
    </Stack>
  );
}
