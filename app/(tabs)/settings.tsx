/**
 * Settings screen — audio mode, haptics, countdown warning.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppSettings, AudioCueMode, TimeRemainingInterval, DEFAULT_SETTINGS } from '../../src/workout/workoutTypes';
import { loadSettings, saveSettings } from '../../src/workout/workoutStorage';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { hapticTap } from '../../src/audio/haptics';

const AUDIO_MODES: { value: AudioCueMode; label: string; icon: string }[] = [
  { value: 'beeps', label: 'Beeps', icon: '🔔' },
  { value: 'voice', label: 'Voice', icon: '🔊' },
  { value: 'both', label: 'Both', icon: '🔔🔊' },
  { value: 'silent', label: 'Silent', icon: '🔇' },
];

const WARNING_OPTIONS = [3, 5, 10, 15, 30];

const TIME_REMAINING_OPTIONS: { value: TimeRemainingInterval; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, [])
  );

  const update = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Audio Mode */}
      <Text style={styles.sectionTitle}>Audio Cues</Text>
      <View style={styles.row}>
        {AUDIO_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.value}
            style={[
              styles.chip,
              settings.audioCueMode === mode.value && styles.chipActive,
            ]}
            onPress={() => {
              hapticTap();
              update({ audioCueMode: mode.value });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>{mode.icon}</Text>
            <Text
              style={[
                styles.chipLabel,
                settings.audioCueMode === mode.value &&
                  styles.chipLabelActive,
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Haptic */}
      <Text style={styles.sectionTitle}>Haptic Feedback</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          Vibrate on interval changes
        </Text>
        <Switch
          value={settings.hapticEnabled}
          onValueChange={(v) => {
            if (v) hapticTap();
            update({ hapticEnabled: v });
          }}
          trackColor={{
            false: Colors.surfaceLight,
            true: Colors.primaryDim,
          }}
          thumbColor={
            settings.hapticEnabled ? Colors.primary : Colors.textMuted
          }
        />
      </View>

      {/* Countdown warning */}
      <Text style={styles.sectionTitle}>Countdown Warning</Text>
      <Text style={styles.sectionSub}>
        Play a warning cue this many seconds before an interval ends
      </Text>
      <View style={styles.row}>
        {WARNING_OPTIONS.map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[
              styles.chip,
              settings.countdownWarningSeconds === sec && styles.chipActive,
            ]}
            onPress={() => {
              hapticTap();
              update({ countdownWarningSeconds: sec });
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipLabel,
                settings.countdownWarningSeconds === sec &&
                  styles.chipLabelActive,
              ]}
            >
              {sec}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time remaining announcements */}
      <Text style={styles.sectionTitle}>Time Remaining</Text>
      <Text style={styles.sectionSub}>
        Announce the time left in each interval (requires Voice or Both audio mode)
      </Text>
      <View style={styles.row}>
        {TIME_REMAINING_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              settings.timeRemainingInterval === opt.value && styles.chipActive,
            ]}
            onPress={() => {
              hapticTap();
              update({ timeRemainingInterval: opt.value });
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipLabel,
                settings.timeRemainingInterval === opt.value &&
                  styles.chipLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Keep screen on */}
      <Text style={styles.sectionTitle}>Display</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Keep screen on during workout</Text>
        <Switch
          value={settings.keepScreenOn}
          onValueChange={(v) => update({ keepScreenOn: v })}
          trackColor={{
            false: Colors.surfaceLight,
            true: Colors.primaryDim,
          }}
          thumbColor={
            settings.keepScreenOn ? Colors.primary : Colors.textMuted
          }
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>PaceCue v1.0</Text>
        <Text style={styles.footerText}>
          Built with ❤️ for runners who don't want subscriptions
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    gap: Spacing.xs,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: Colors.primary,
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
  footer: {
    marginTop: Spacing.xxl * 2,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
