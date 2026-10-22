/**
 * VoiceInput — Reusable voice recording component.
 *
 * Tap microphone button to start recording, tap again to stop and transcribe.
 * Shows recording state with animated indicator and transcription loading.
 *
 * Wrapped in an error boundary so a missing native recording module
 * doesn't crash the parent screen.
 */

import React, { useState, useCallback, useRef, useEffect, Component, type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { transcribeAudio } from '../ai/transcriptionService';

interface Props {
  onTranscription: (text: string) => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  placeholder?: string;
  compact?: boolean;
}

// ── Error Boundary ─────────────────────────────────────────

class VoiceInputErrorBoundary extends Component<
  { compact?: boolean; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { compact?: boolean; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('VoiceInput unavailable:', error.message);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <TouchableOpacity
            style={styles.compactBtn}
            onPress={() =>
              Alert.alert(
                'Voice Not Available',
                'Voice input requires a development build with microphone access. Please type your message instead.',
              )
            }
            activeOpacity={0.7}
          >
            <Ionicons name="mic-off" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        );
      }
      return null;
    }

    return this.props.children;
  }
}

// ── Inner component (uses hooks) ───────────────────────────

function VoiceInputInner({
  onTranscription,
  onRecordingStart,
  onRecordingEnd,
  placeholder = 'Tap to speak',
  compact = false,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    (async () => {
      try {
        const result = await AudioModule.requestRecordingPermissionsAsync();
        setHasPermission(result.granted);
      } catch {
        setHasPermission(false);
      }
    })();
  }, []);

  // Pulse animation while recording
  useEffect(() => {
    if (status === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const startRecording = useCallback(async () => {
    if (hasPermission === false) {
      Alert.alert(
        'Microphone Access',
        'PaceCue needs microphone access for voice input. Enable it in Settings.',
      );
      return;
    }

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
      onRecordingStart?.();
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  }, [hasPermission, recorder, onRecordingStart]);

  const stopRecording = useCallback(async () => {
    if (status !== 'recording') return;

    try {
      await recorder.stop();
      onRecordingEnd?.();
      setStatus('transcribing');

      const uri = recorder.uri;
      if (!uri) {
        setStatus('idle');
        return;
      }

      const result = await transcribeAudio(uri, 'audio/m4a');

      if (result.text.trim()) {
        onTranscription(result.text.trim());
      }

      setStatus('idle');
    } catch (err) {
      console.error('Transcription failed:', err);
      setStatus('idle');
      Alert.alert(
        'Transcription Error',
        'Could not transcribe your voice. Please try again or type instead.',
      );
    }
  }, [status, recorder, onTranscription, onRecordingEnd]);

  const handlePress = useCallback(() => {
    if (status === 'recording') {
      stopRecording();
    } else if (status === 'idle') {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactBtn, status === 'recording' && styles.compactBtnActive]}
        onPress={handlePress}
        disabled={status === 'transcribing'}
        activeOpacity={0.7}
      >
        {status === 'transcribing' ? (
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
        ) : (
          <Animated.View style={{ transform: [{ scale: status === 'recording' ? pulseAnim : 1 }] }}>
            <Ionicons
              name={status === 'recording' ? 'stop-circle' : 'mic'}
              size={20}
              color={status === 'recording' ? Colors.danger : Colors.accent}
            />
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.recordBtn, status === 'recording' && styles.recordBtnActive]}
        onPress={handlePress}
        disabled={status === 'transcribing'}
        activeOpacity={0.7}
      >
        {status === 'transcribing' ? (
          <>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.textSecondary} />
            <Text style={styles.statusText}>Transcribing…</Text>
          </>
        ) : (
          <>
            <Animated.View style={{ transform: [{ scale: status === 'recording' ? pulseAnim : 1 }] }}>
              <Ionicons
                name={status === 'recording' ? 'stop-circle' : 'mic'}
                size={32}
                color={status === 'recording' ? Colors.danger : Colors.accent}
              />
            </Animated.View>
            <Text style={[styles.statusText, status === 'recording' && styles.recordingText]}>
              {status === 'recording' ? 'Tap to stop' : placeholder}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Public export (wrapped in error boundary) ──────────────

export function VoiceInput(props: Props) {
  return (
    <VoiceInputErrorBoundary compact={props.compact}>
      <VoiceInputInner {...props} />
    </VoiceInputErrorBoundary>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    minWidth: 200,
  },
  recordBtnActive: {
    borderColor: Colors.danger + '50',
    backgroundColor: Colors.danger + '10',
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  recordingText: {
    color: Colors.danger,
    fontWeight: '600',
  },
  compactBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtnActive: {
    borderColor: Colors.danger + '50',
    backgroundColor: Colors.danger + '10',
  },
});
