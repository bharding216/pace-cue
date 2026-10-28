/**
 * Shared "Push to Strava" button component.
 *
 * Used on both the post-workout finished screen and the run history
 * details screen. Only renders when the user is signed in and has
 * Strava connected.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useStrava } from './useStrava';
import { hapticTap } from '../audio/haptics';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import type {
  CompletedWorkout,
  RoutePoint,
  IntervalSplit,
  WorkoutDefinition,
} from '../workout/workoutTypes';

interface StravaPushButtonProps {
  /** The completed workout entry ID (must be set before render). */
  completedEntryId: string | null;
  workoutName: string;
  workoutId: string;
  completedAt: number;
  totalDurationMs: number;
  totalDistanceMeters?: number;
  route?: RoutePoint[];
  splits?: IntervalSplit[];
  configuration?: WorkoutDefinition;
}

type PushState = 'idle' | 'pushing' | 'success' | 'error';

export function StravaPushButton({
  completedEntryId,
  workoutName,
  workoutId,
  completedAt,
  totalDurationMs,
  totalDistanceMeters,
  route,
  splits,
  configuration,
}: StravaPushButtonProps) {
  const { user } = useAuth();
  const strava = useStrava();
  const [pushState, setPushState] = useState<PushState>('idle');
  const [activityUrl, setActivityUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Don't render if user isn't signed in, Strava isn't connected,
  // or the workout hasn't been saved yet
  if (!user || strava.loading) return null;
  if (!strava.isConnected) return null;
  if (!completedEntryId) return null;

  const handlePush = async () => {
    hapticTap();
    setPushState('pushing');
    setErrorMessage(null);

    const completed: CompletedWorkout = {
      id: completedEntryId,
      workoutId,
      workoutName,
      completedAt,
      totalDurationMs,
      totalDistanceMeters,
      route,
      splits,
      configuration,
    };

    const result = await strava.pushWorkout(completed);

    if (result.success) {
      setPushState('success');
      if (result.activityUrl) {
        setActivityUrl(result.activityUrl);
      }
    } else {
      setPushState('error');
      setErrorMessage(result.error ?? 'Upload failed');
    }
  };

  if (pushState === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          <Text style={styles.successText}>Uploaded to Strava</Text>
        </View>
        {activityUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(activityUrl)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewLink}>View on Strava</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (pushState === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={18} color={Colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={handlePush}
          activeOpacity={0.7}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.pushBtn}
        onPress={handlePush}
        disabled={pushState === 'pushing'}
        activeOpacity={0.8}
      >
        {pushState === 'pushing' ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="fitness-outline" size={18} color="#FFFFFF" />
            <Text style={styles.pushBtnText}>Push to Strava</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const STRAVA_ORANGE = '#FC4C02';

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  pushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STRAVA_ORANGE,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  pushBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  successText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  viewLink: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: STRAVA_ORANGE,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    flex: 1,
  },
  retryBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: STRAVA_ORANGE,
  },
});
