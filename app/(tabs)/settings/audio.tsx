/**
 * Audio & Cues settings — audio mode, voice selection, countdown warning,
 * interval progress announcements, and music ducking.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import {
  AppSettings,
  AudioCueMode,
  TimeRemainingInterval,
  DEFAULT_SETTINGS,
} from '../../../src/workout/workoutTypes';
import { loadSettings, saveSettings } from '../../../src/workout/workoutStorage';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import { hapticTap } from '../../../src/audio/haptics';
import {
  configureAudio,
  getAvailableVoices,
  setVoiceIdentifier,
  speak,
} from '../../../src/audio/audioManager';
import VoicePickerSheet from '../../../src/components/VoicePickerSheet';

const AUDIO_MODES: {
  value: AudioCueMode;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'beeps', label: 'Beeps', icon: 'notifications-outline' },
  { value: 'voice', label: 'Voice', icon: 'volume-high-outline' },
  { value: 'both', label: 'Both', icon: 'volume-medium-outline' },
  { value: 'silent', label: 'Silent', icon: 'volume-mute-outline' },
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

function formatVoiceName(voice: Speech.Voice): string {
  let name = voice.name;
  if (name.startsWith('en-') && name.includes('#')) {
    name = name.split('#').pop() ?? name;
  }
  const quality =
    voice.quality === Speech.VoiceQuality.Enhanced ? ' (Enhanced)' : '';
  if (name.includes('Enhanced') || name.includes('Premium')) return name;
  return `${name}${quality}`;
}

export default function AudioSettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicePickerVisible, setVoicePickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setSettings(s);
        configureAudio(s.duckOtherAudio);
      });
      setVoicesLoading(true);
      getAvailableVoices('en').then((v) => {
        setVoices(v);
        setVoicesLoading(false);
      });
    }, []),
  );

  const update = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
    if ('duckOtherAudio' in partial) {
      configureAudio(next.duckOtherAudio);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            <Ionicons
              name={mode.icon}
              size={16}
              color={
                settings.audioCueMode === mode.value
                  ? Colors.primary
                  : Colors.textSecondary
              }
            />
            <Text
              style={[
                styles.chipLabel,
                settings.audioCueMode === mode.value && styles.chipLabelActive,
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Duck other audio */}
      {settings.audioCueMode !== 'silent' && (
        <View style={styles.settingRow}>
          <View style={{ flex: 1, marginRight: Spacing.md }}>
            <Text style={styles.settingLabel}>Lower music during cues</Text>
            <Text style={styles.settingHint}>
              Automatically dips Spotify and other audio so cues stand out
            </Text>
          </View>
          <Switch
            value={settings.duckOtherAudio}
            onValueChange={(v) => {
              hapticTap();
              update({ duckOtherAudio: v });
            }}
            trackColor={{ false: Colors.surfaceLight, true: Colors.primaryDim }}
            thumbColor={settings.duckOtherAudio ? Colors.primary : Colors.textMuted}
          />
        </View>
      )}

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
              <TouchableOpacity
                style={styles.voiceSelector}
                onPress={() => {
                  hapticTap();
                  setVoicePickerVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.voiceSelectorName}>
                    {settings.voiceIdentifier === null
                      ? 'System Default'
                      : (() => {
                          const v = voices.find(
                            (v) => v.identifier === settings.voiceIdentifier,
                          );
                          return v ? formatVoiceName(v) : 'Selected voice';
                        })()}
                  </Text>
                  <Text style={styles.voiceSelectorSub}>
                    {voices.length} voice{voices.length !== 1 ? 's' : ''} available ·
                    Tap to change
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              <VoicePickerSheet
                visible={voicePickerVisible}
                voices={voices}
                selectedId={settings.voiceIdentifier}
                onSelect={(id) => {
                  setVoiceIdentifier(id);
                  update({ voiceIdentifier: id });
                }}
                onPreview={(id) => {
                  setVoiceIdentifier(id);
                  speak('Starting warmup.');
                }}
                onClose={() => setVoicePickerVisible(false)}
              />

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.downloadVoicesRow}
                  onPress={() => {
                    Linking.openURL('App-prefs:').catch(() =>
                      Linking.openURL('app-settings:').catch(() => {}),
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="download-outline" size={18} color={Colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.downloadVoicesLabel}>
                      Download Premium Voices
                    </Text>
                    <Text style={styles.downloadVoicesSub}>
                      Opens Settings — go to Accessibility › Read & Speak › Voices ›
                      English to download enhanced voices
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}

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
                settings.countdownWarningSeconds === sec && styles.chipLabelActive,
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
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  chipLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  chipLabelActive: { color: Colors.primary },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  settingLabel: { fontSize: FontSize.md, color: Colors.textPrimary, flex: 1, marginRight: Spacing.md },
  settingHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  voiceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary + '44',
  },
  voiceSelectorName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
  voiceSelectorSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 24, fontWeight: '300', color: Colors.textMuted, marginLeft: Spacing.sm },
  downloadVoicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    gap: Spacing.sm,
  },
  downloadVoicesLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  downloadVoicesSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
