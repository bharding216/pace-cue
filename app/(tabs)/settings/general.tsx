/**
 * General settings — haptic feedback and display preferences.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppSettings, DEFAULT_SETTINGS } from '../../../src/workout/workoutTypes';
import { loadSettings, saveSettings } from '../../../src/workout/workoutStorage';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import { hapticTap } from '../../../src/audio/haptics';

export default function GeneralSettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, []),
  );

  const update = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Haptic */}
      <Text style={styles.sectionTitle}>Haptic Feedback</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Vibrate on interval changes</Text>
        <Switch
          value={settings.hapticEnabled}
          onValueChange={(v) => {
            if (v) hapticTap();
            update({ hapticEnabled: v });
          }}
          trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
          thumbColor={settings.hapticEnabled ? Colors.primary : Colors.textMuted}
        />
      </View>

      {/* Keep screen on */}
      <Text style={styles.sectionTitle}>Display</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Keep screen on during workout</Text>
        <Switch
          value={settings.keepScreenOn}
          onValueChange={(v) => update({ keepScreenOn: v })}
          trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
          thumbColor={settings.keepScreenOn ? Colors.primary : Colors.textMuted}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  settingLabel: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.md,
  },
});
