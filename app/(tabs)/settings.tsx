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
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { AppSettings, AudioCueMode, TimeRemainingInterval, DEFAULT_SETTINGS } from '../../src/workout/workoutTypes';
import { loadSettings, saveSettings } from '../../src/workout/workoutStorage';
import Constants from 'expo-constants';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { hapticTap } from '../../src/audio/haptics';
import { exportData, importData } from '../../src/workout/backupManager';
import { getAvailableVoices, setVoiceIdentifier, speak } from '../../src/audio/audioManager';

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
  { value: 45, label: '45s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
];

/** Pretty-print a voice name for display (strip Apple identifier prefixes). */
function formatVoiceName(voice: Speech.Voice): string {
  // iOS names look like "Samantha" or "Zoe (Enhanced)"; Android like "en-us-x-sfg#male_1-local"
  let name = voice.name;
  // Remove common Android prefixes
  if (name.startsWith('en-') && name.includes('#')) {
    name = name.split('#').pop() ?? name;
  }
  const quality =
    voice.quality === Speech.VoiceQuality.Enhanced ? ' (Enhanced)' : '';
  // Avoid duplicating "(Enhanced)" if the name already contains it
  if (name.includes('Enhanced') || name.includes('Premium')) return name;
  return `${name}${quality}`;
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
      // Load available voices each time the screen is focused, since
      // the user may have downloaded new voices in system settings.
      setVoicesLoading(true);
      getAvailableVoices('en').then((v) => {
        setVoices(v);
        setVoicesLoading(false);
      });
    }, [])
  );

  const update = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportData();
    } catch (e: any) {
      Alert.alert('Export Failed', e.message ?? 'Something went wrong.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importData();
      if (result) {
        // Reload settings since they were just overwritten
        loadSettings().then(setSettings);
        Alert.alert(
          'Import Complete',
          `Restored ${result.workoutsCount} workout${result.workoutsCount !== 1 ? 's' : ''} and ${result.historyCount} history entr${result.historyCount !== 1 ? 'ies' : 'y'}.`
        );
      }
    } catch (e: any) {
      Alert.alert('Import Failed', e.message ?? 'Could not read backup file.');
    } finally {
      setImporting(false);
    }
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

      {/* Voice Selection */}
      {(settings.audioCueMode === 'voice' || settings.audioCueMode === 'both') && (
        <>
          <Text style={styles.sectionTitle}>Voice</Text>
          <Text style={styles.sectionSub}>
            Choose a voice for spoken cues. Enhanced voices sound more natural.
          </Text>
          {voicesLoading ? (
            <ActivityIndicator
              color={Colors.primary}
              size="small"
              style={{ marginTop: Spacing.sm }}
            />
          ) : voices.length === 0 ? (
            <Text style={[styles.sectionSub, { marginTop: Spacing.sm }]}>
              No English voices found on this device.
            </Text>
          ) : (
            <>
              {/* Auto / default option */}
              <TouchableOpacity
                style={[
                  styles.voiceRow,
                  settings.voiceIdentifier === null && styles.voiceRowActive,
                ]}
                onPress={() => {
                  hapticTap();
                  setVoiceIdentifier(null);
                  update({ voiceIdentifier: null });
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.voiceName,
                      settings.voiceIdentifier === null && styles.voiceNameActive,
                    ]}
                  >
                    Auto (best available)
                  </Text>
                  <Text style={styles.voiceSub}>
                    Automatically picks the highest-quality voice on your device
                  </Text>
                </View>
              </TouchableOpacity>

              {voices.map((voice) => (
                <TouchableOpacity
                  key={voice.identifier}
                  style={[
                    styles.voiceRow,
                    settings.voiceIdentifier === voice.identifier &&
                      styles.voiceRowActive,
                  ]}
                  onPress={() => {
                    hapticTap();
                    setVoiceIdentifier(voice.identifier);
                    update({ voiceIdentifier: voice.identifier });
                    // Preview the voice
                    speak('Starting hard for 3 minutes.');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.voiceName,
                        settings.voiceIdentifier === voice.identifier &&
                          styles.voiceNameActive,
                      ]}
                    >
                      {formatVoiceName(voice)}
                    </Text>
                    <Text style={styles.voiceSub}>{voice.language}</Text>
                  </View>
                  {voice.quality === Speech.VoiceQuality.Enhanced && (
                    <View style={styles.enhancedBadge}>
                      <Text style={styles.enhancedBadgeText}>Enhanced</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* Nudge if no enhanced voices are available */}
              {!voices.some(
                (v) => v.quality === Speech.VoiceQuality.Enhanced
              ) && (
                <TouchableOpacity
                  style={styles.nudgeBanner}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      Linking.openURL('App-prefs:ACCESSIBILITY&path=SPEECH');
                    } else {
                      Linking.openSettings();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.nudgeText}>
                    Want better-sounding voices? Download an Enhanced voice in
                    your device's Accessibility settings.
                  </Text>
                  <Text style={styles.nudgeLink}>Open Settings →</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}

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

      {/* Interval progress announcements */}
      <Text style={styles.sectionTitle}>Interval Progress</Text>
      <Text style={styles.sectionSub}>
        Announce elapsed time during each interval (requires Voice or Both audio mode)
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

      {/* Backup / Restore */}
      <Text style={styles.sectionTitle}>Your Data</Text>
      <Text style={styles.sectionSub}>
        Export your workouts, history, and settings to a file so you can restore them later.
      </Text>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={handleExport}
        disabled={exporting}
        activeOpacity={0.7}
      >
        {exporting ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Text style={styles.actionBtnIcon}>📤</Text>
        )}
        <Text style={styles.actionBtnLabel}>Export Backup</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, { marginTop: Spacing.sm }]}
        onPress={handleImport}
        disabled={importing}
        activeOpacity={0.7}
      >
        {importing ? (
          <ActivityIndicator color={Colors.accent} size="small" />
        ) : (
          <Text style={styles.actionBtnIcon}>📥</Text>
        )}
        <Text style={styles.actionBtnLabel}>Import Backup</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>PaceCue v{Constants.expoConfig?.version ?? '?'}</Text>
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
  },
  actionBtnIcon: {
    fontSize: 20,
  },
  actionBtnLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
  },
  voiceRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  voiceName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  voiceNameActive: {
    color: Colors.primary,
  },
  voiceSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  enhancedBadge: {
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  enhancedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  nudgeBanner: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent + '44',
  },
  nudgeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  nudgeLink: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
    marginTop: Spacing.xs,
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
