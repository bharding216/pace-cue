/**
 * Plan setup screen — structured form to create a training plan.
 * Race distance, date, goal time, days/week, profile summary.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { useSubscription } from '../../../src/contexts/SubscriptionContext';
import { supabase } from '../../../src/analytics/supabaseClient';
import { generatePlan, savePlan } from '../../../src/ai/planService';
import { loadHistory } from '../../../src/workout/workoutStorage';
import { buildHistorySummary, serializeHistorySummary } from '../../../src/ai/historySummary';
import type { RaceType, RunningProfile, RunningPreference } from '../../../src/types/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

const RACE_OPTIONS: { value: RaceType; label: string; distance: string }[] = [
  { value: '5k', label: '5K', distance: '3.1 mi' },
  { value: '10k', label: '10K', distance: '6.2 mi' },
  { value: 'half_marathon', label: 'Half Marathon', distance: '13.1 mi' },
  { value: 'marathon', label: 'Marathon', distance: '26.2 mi' },
  { value: 'custom', label: 'Custom', distance: '' },
];

const DAYS_PER_WEEK_OPTIONS = [3, 4, 5, 6, 7];

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function paceToMMSS(decimal: number): string {
  const mins = Math.floor(decimal);
  const secs = Math.round((decimal - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function PlanSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh } = useTrainingPlan();
  const { tier } = useSubscription();

  const [raceType, setRaceType] = useState<RaceType>('half_marathon');
  const [raceDate, setRaceDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d;
  });
  const [showRaceDatePicker, setShowRaceDatePicker] = useState(false);
  const [goalTimeHours, setGoalTimeHours] = useState('');
  const [goalTimeMinutes, setGoalTimeMinutes] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [startDate, setStartDate] = useState(getNextMonday());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<RunningProfile | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  // Load running profile
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    (async () => {
      const [{ data: profileData }, { data: prefData }] = await Promise.all([
        supabase
          .from('running_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('running_preferences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at'),
      ]);

      setProfile(profileData);
      setGoals(
        (prefData ?? [])
          .filter((p: RunningPreference) => p.category === 'goal')
          .map((p: RunningPreference) => p.content)
      );
      setPreferences(
        (prefData ?? [])
          .filter((p: RunningPreference) => p.category === 'preference')
          .map((p: RunningPreference) => p.content)
      );
      setProfileLoading(false);
    })();
  }, [user?.id]);

  const handleGenerate = useCallback(async () => {
    if (!user) {
      router.push('/login' as any);
      return;
    }

    const goalTimeTotal =
      (parseInt(goalTimeHours || '0', 10) * 60) + parseInt(goalTimeMinutes || '0', 10);

    const raceDateStr = `${raceDate.getFullYear()}-${String(raceDate.getMonth() + 1).padStart(2, '0')}-${String(raceDate.getDate()).padStart(2, '0')}`;
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    if (new Date(raceDateStr) <= new Date(startDateStr)) {
      Alert.alert('Invalid Dates', 'Race date must be after the start date.');
      return;
    }

    setGenerating(true);
    try {
      // Build history summary
      const historyData = await loadHistory();
      const summary = historyData.length > 0
        ? serializeHistorySummary(buildHistorySummary(historyData))
        : null;

      const profilePayload = {
        experience_level: profile?.experience_level,
        typical_run_minutes: profile?.typical_run_minutes ?? undefined,
        typical_run_minutes_max: profile?.typical_run_minutes_max ?? undefined,
        easy_pace: profile?.easy_pace ?? undefined,
        fast_pace: profile?.fast_pace ?? undefined,
        race_times: profile?.race_times ?? undefined,
      };

      const result = await generatePlan({
        profile: profilePayload,
        goals,
        preferences,
        raceType,
        raceDate: raceDateStr,
        goalTimeMinutes: goalTimeTotal > 0 ? goalTimeTotal : null,
        startDate: startDateStr,
        daysPerWeek,
        historySummary: summary,
      });

      await savePlan(user.id, {
        profile: profilePayload,
        goals,
        preferences,
        raceType,
        raceDate: raceDateStr,
        goalTimeMinutes: goalTimeTotal > 0 ? goalTimeTotal : null,
        startDate: startDateStr,
        daysPerWeek,
        historySummary: summary,
      }, result);

      await refresh();
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [user, raceType, raceDate, goalTimeHours, goalTimeMinutes, daysPerWeek, startDate, profile, goals, preferences, refresh, router]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Sign in Required</Text>
        <Text style={styles.emptyText}>Sign in to create a training plan.</Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => router.push('/login' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Profile summary */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => router.push('/(tabs)/training/profile' as any)}
        activeOpacity={0.7}
      >
        <Ionicons name="person-circle-outline" size={28} color={Colors.textSecondary} />
        <View style={styles.profileInfo}>
          {profileLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : profile ? (
            <>
              <Text style={styles.profileName}>
                {profile.experience_level?.charAt(0).toUpperCase()}{profile.experience_level?.slice(1)} runner
                {profile.typical_run_minutes
                  ? profile.typical_run_minutes_max
                    ? ` · ${profile.typical_run_minutes}–${profile.typical_run_minutes_max} min`
                    : ` · ${profile.typical_run_minutes} min`
                  : ''}
              </Text>
              <Text style={styles.profilePaces}>
                {profile.easy_pace ? `Easy: ${paceToMMSS(profile.easy_pace)}/mi` : ''}
                {profile.easy_pace && profile.fast_pace ? ' · ' : ''}
                {profile.fast_pace ? `Fast: ${paceToMMSS(profile.fast_pace)}/mi` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.profileEmpty}>Set up your running profile</Text>
          )}
        </View>
        <Text style={styles.profileEdit}>Edit</Text>
      </TouchableOpacity>

      {/* Race distance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Race Distance</Text>
        <View style={styles.chipRow}>
          {RACE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.raceChip, raceType === opt.value && styles.raceChipActive]}
              onPress={() => setRaceType(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.raceChipLabel, raceType === opt.value && styles.raceChipLabelActive]}>
                {opt.label}
              </Text>
              {opt.distance ? (
                <Text style={styles.raceChipDistance}>{opt.distance}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Race date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Race Date</Text>
        {Platform.OS === 'ios' ? (
          <View style={styles.datePickerRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            <DateTimePicker
              value={raceDate}
              mode="date"
              display="compact"
              minimumDate={new Date()}
              onChange={(_, date) => {
                if (date) setRaceDate(date);
              }}
              themeVariant="dark"
              accentColor={Colors.primary}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowRaceDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.dateBtnText}>{formatDateShort(raceDate)}</Text>
            </TouchableOpacity>
            {showRaceDatePicker && (
              <DateTimePicker
                value={raceDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowRaceDatePicker(false);
                  if (date) setRaceDate(date);
                }}
                themeVariant="dark"
              />
            )}
          </>
        )}
      </View>

      {/* Goal time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goal Time (optional)</Text>
        <View style={styles.goalTimeRow}>
          <View style={styles.goalTimeInput}>
            <TextInput
              style={styles.goalTimeField}
              value={goalTimeHours}
              onChangeText={setGoalTimeHours}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.goalTimeLabel}>hours</Text>
          </View>
          <View style={styles.goalTimeInput}>
            <TextInput
              style={styles.goalTimeField}
              value={goalTimeMinutes}
              onChangeText={setGoalTimeMinutes}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.goalTimeLabel}>min</Text>
          </View>
        </View>
      </View>

      {/* Days per week */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training Days per Week</Text>
        <View style={styles.chipRow}>
          {DAYS_PER_WEEK_OPTIONS.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.dayChip, daysPerWeek === n && styles.dayChipActive]}
              onPress={() => setDaysPerWeek(n)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayChipText, daysPerWeek === n && styles.dayChipTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Start date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Start Date</Text>
        {Platform.OS === 'ios' ? (
          <View style={styles.datePickerRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            <DateTimePicker
              value={startDate}
              mode="date"
              display="compact"
              minimumDate={new Date()}
              onChange={(_, date) => {
                if (date) setStartDate(date);
              }}
              themeVariant="dark"
              accentColor={Colors.primary}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowStartDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.dateBtnText}>{formatDateShort(startDate)}</Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowStartDatePicker(false);
                  if (date) setStartDate(date);
                }}
                themeVariant="dark"
              />
            )}
          </>
        )}
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={generating}
        activeOpacity={0.8}
      >
        {generating ? (
          <ActivityIndicator color={Colors.black} size="small" />
        ) : (
          <Ionicons name="sparkles" size={18} color={Colors.black} />
        )}
        <Text style={styles.generateBtnText}>
          {generating ? 'Generating Plan...' : 'Generate Training Plan'}
        </Text>
      </TouchableOpacity>

      {generating && (
        <Text style={styles.generatingHint}>
          This may take a moment. We're building a personalized plan just for you.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl * 2,
    marginTop: Spacing.md,
  },
  signInBtnText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  profilePaces: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  profileEmpty: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  profileEdit: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // Race chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  raceChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  raceChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  raceChipLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  raceChipLabelActive: {
    color: Colors.primary,
  },
  raceChipDistance: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Date buttons
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  dateBtnText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },

  // Goal time
  goalTimeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  goalTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalTimeField: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    width: 60,
    textAlign: 'center',
  },
  goalTimeLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Days per week
  dayChip: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
  },
  dayChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  dayChipText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dayChipTextActive: {
    color: Colors.primary,
  },

  // Generate
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  generateBtnText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  generatingHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
