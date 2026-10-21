/**
 * Plan setup screen — structured form to create a training plan.
 * Race distance, date, goal time, days/week, profile summary.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { useSubscription } from '../../../src/contexts/SubscriptionContext';
import { supabase } from '../../../src/analytics/supabaseClient';
import { generatePlanOutline, savePlanOutline, generateWorkoutDetailsWithProfile } from '../../../src/ai/planService';
import { loadHistory } from '../../../src/workout/workoutStorage';
import { buildHistorySummary, serializeHistorySummary } from '../../../src/ai/historySummary';
import type { RaceType, RunningProfile, RunningPreference } from '../../../src/types/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

const DRAFT_KEY = 'plan-setup-draft';

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

type GenPhase = 'idle' | 'analyzing' | 'generating' | 'saving' | 'done';

const GEN_STEPS: { phase: GenPhase; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { phase: 'analyzing', label: 'Analyzing your profile', icon: 'person-outline' },
  { phase: 'generating', label: 'Building training plan', icon: 'sparkles-outline' },
  { phase: 'saving', label: 'Saving your plan', icon: 'cloud-upload-outline' },
];

interface PlanSummary {
  totalWeeks: number;
  totalWorkouts: number;
  raceType: RaceType;
  raceDate: string;
  goalTimeMinutes: number | null;
}

function formatRaceLabel(raceType: RaceType): string {
  switch (raceType) {
    case '5k': return '5K';
    case '10k': return '10K';
    case 'half_marathon': return 'half marathon';
    case 'marathon': return 'marathon';
    default: return 'race';
  }
}

function buildCoachMessage(s: PlanSummary): string {
  const race = formatRaceLabel(s.raceType);

  let goalPart: string;
  if (s.goalTimeMinutes && s.goalTimeMinutes > 0) {
    const hrs = Math.floor(s.goalTimeMinutes / 60);
    const mins = Math.round(s.goalTimeMinutes % 60);
    const timeStr =
      hrs > 0
        ? `${hrs}:${mins.toString().padStart(2, '0')}`
        : `${mins}-minute`;
    goalPart = `run a sub-${timeStr} ${race}`;
  } else {
    goalPart = `train for your ${race}`;
  }

  return `Here's your ${s.totalWeeks}-week plan to ${goalPart}. I've added ${s.totalWorkouts} workouts to your calendar.`;
}

export default function PlanSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh } = useTrainingPlan();
  const { tier } = useSubscription();
  const mountedRef = useRef(true);
  const draftLoaded = useRef(false);

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
  const [limitations, setLimitations] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  const [genPhase, setGenPhase] = useState<GenPhase>('idle');
  const [genElapsed, setGenElapsed] = useState(0);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const generating = genPhase !== 'idle';

  // Track mounted state for safe async updates
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Restore draft form values on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) { draftLoaded.current = true; return; }
        const draft = JSON.parse(raw);
        if (draft.raceType) setRaceType(draft.raceType);
        if (draft.raceDate) setRaceDate(new Date(draft.raceDate));
        if (draft.goalTimeHours != null) setGoalTimeHours(draft.goalTimeHours);
        if (draft.goalTimeMinutes != null) setGoalTimeMinutes(draft.goalTimeMinutes);
        if (draft.daysPerWeek) setDaysPerWeek(draft.daysPerWeek);
        if (draft.startDate) setStartDate(new Date(draft.startDate));
      } catch {}
      draftLoaded.current = true;
    })();
  }, []);

  // Tick elapsed seconds while generating
  useEffect(() => {
    if (!generating) { setGenElapsed(0); return; }
    const interval = setInterval(() => {
      setGenElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [generating]);

  // Animate progress bar based on generation phase
  useEffect(() => {
    if (genPhase === 'analyzing') {
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 0.1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } else if (genPhase === 'generating') {
      Animated.timing(progressAnim, {
        toValue: 0.88,
        duration: 18000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else if (genPhase === 'saving') {
      progressAnim.stopAnimation(() => {
        Animated.timing(progressAnim, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: false,
        }).start();
      });
    } else if (genPhase === 'done') {
      progressAnim.stopAnimation(() => {
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
    } else {
      progressAnim.setValue(0);
    }
  }, [genPhase]);

  // Persist draft whenever inputs change (debounced via effect)
  useEffect(() => {
    if (!draftLoaded.current) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
        raceType,
        raceDate: raceDate.toISOString(),
        goalTimeHours,
        goalTimeMinutes,
        daysPerWeek,
        startDate: startDate.toISOString(),
      })).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [raceType, raceDate, goalTimeHours, goalTimeMinutes, daysPerWeek, startDate]);

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
      setLimitations(
        (prefData ?? [])
          .filter((p: RunningPreference) => p.category === 'limitation')
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

    setGenPhase('analyzing');
    try {
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
        weekly_mileage: profile?.weekly_mileage ?? undefined,
        longest_recent_run_minutes: profile?.longest_recent_run_minutes ?? undefined,
        max_workout_minutes: profile?.max_workout_minutes ?? undefined,
        preferred_days: profile?.preferred_days ?? undefined,
        cross_training: profile?.cross_training ?? undefined,
      };

      const input = {
        profile: profilePayload,
        goals,
        preferences,
        limitations,
        raceType,
        raceDate: raceDateStr,
        goalTimeMinutes: goalTimeTotal > 0 ? goalTimeTotal : null,
        startDate: startDateStr,
        daysPerWeek,
        historySummary: summary,
      };

      if (!mountedRef.current) return;
      setGenPhase('generating');
      const outline = await generatePlanOutline(input);

      if (!mountedRef.current) return;
      setGenPhase('saving');
      const { plan: savedPlan, workouts: savedWorkouts } = await savePlanOutline(user.id, input, outline);
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});

      if (!mountedRef.current) return;

      setPlanSummary({
        totalWeeks: outline.weeks.length,
        totalWorkouts: savedWorkouts.filter((w) => w.day_label !== 'Rest Day').length,
        raceType: input.raceType,
        raceDate: input.raceDate,
        goalTimeMinutes: input.goalTimeMinutes ?? null,
      });
      setGenPhase('done');
      await refresh();

      // Generate details for the first 3 workouts in the background
      const today = new Date().toISOString().split('T')[0];
      const upcoming = savedWorkouts
        .filter((w) => w.date >= today && w.day_label !== 'Rest Day')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);

      if (upcoming.length > 0) {
        generateWorkoutDetailsWithProfile(savedPlan, upcoming, profilePayload)
          .then(() => refresh())
          .catch((err) => console.warn('Background detail generation failed:', err));
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setGenPhase('idle');
        Alert.alert('Error', err.message || 'Failed to generate plan. Please try again.');
      }
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

  // ── Summary screen after plan is created ────────────────────
  if (genPhase === 'done' && planSummary) {
    const raceDateFmt = new Date(planSummary.raceDate + 'T00:00:00').toLocaleDateString(
      undefined,
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    );

    return (
      <View style={styles.genScreen}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={styles.summaryScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.genCard}>
            {/* Header */}
            <View style={styles.genHeader}>
              <View style={[styles.genSparkleWrap, styles.genDoneWrap]}>
                <Ionicons name="checkmark-sharp" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.genTitle}>Plan Created!</Text>
            </View>

            {/* Coach message */}
            <Text style={styles.summaryMessage}>{buildCoachMessage(planSummary)}</Text>

            {/* Stats row */}
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.summaryStatValue}>{planSummary.totalWeeks}</Text>
                <Text style={styles.summaryStatLabel}>weeks</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Ionicons name="barbell-outline" size={18} color={Colors.accent} />
                <Text style={styles.summaryStatValue}>{planSummary.totalWorkouts}</Text>
                <Text style={styles.summaryStatLabel}>workouts</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Ionicons name="flag-outline" size={18} color={Colors.warning} />
                <Text style={styles.summaryStatLabel}>Race day</Text>
                <Text style={styles.summaryStatDate}>{raceDateFmt}</Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.summaryCta}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar" size={18} color={Colors.black} />
              <Text style={styles.summaryCtaText}>View Your Calendar</Text>
            </TouchableOpacity>

            <Text style={styles.genTimer}>Completed in {genElapsed}s</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Progress overlay while generating ─────────────────────
  if (generating) {
    const currentIdx = GEN_STEPS.findIndex((s) => s.phase === genPhase);

    return (
      <View style={styles.genScreen}>
        <View style={styles.genCard}>
          {/* Header */}
          <View style={styles.genHeader}>
            <View style={styles.genSparkleWrap}>
              <Ionicons name="sparkles" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.genTitle}>Creating Your Plan</Text>
          </View>

          {/* Steps */}
          <View style={styles.genSteps}>
            {GEN_STEPS.map((step, i) => {
              const isDone = currentIdx > i;
              const isActive = currentIdx === i;

              return (
                <View key={step.phase} style={styles.genStepRow}>
                  <View
                    style={[
                      styles.genStepCircle,
                      isDone && styles.genStepCircleDone,
                      isActive && styles.genStepCircleActive,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark-sharp" size={13} color={Colors.black} />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name={step.icon} size={13} color={Colors.textMuted} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.genStepLabel,
                      isDone && styles.genStepLabelDone,
                      isActive && styles.genStepLabelActive,
                    ]}
                  >
                    {step.label}
                    {isActive ? '…' : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Progress bar */}
          <View style={styles.genProgressTrack}>
            <Animated.View
              style={[
                styles.genProgressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Timer / estimate */}
          <Text style={styles.genTimer}>{genElapsed}s · usually 10–15s</Text>
        </View>
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
        style={styles.generateBtn}
        onPress={handleGenerate}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={18} color={Colors.black} />
        <Text style={styles.generateBtnText}>Generate Training Plan</Text>
      </TouchableOpacity>
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
  generateBtnText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },

  // Generation progress overlay
  genScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  genCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  genHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  genSparkleWrap: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  genTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  genSteps: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  genStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  genStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genStepCircleDone: {
    backgroundColor: Colors.primary,
  },
  genStepCircleActive: {
    backgroundColor: Colors.primary + '18',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  genStepLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  genStepLabelDone: {
    color: Colors.textSecondary,
  },
  genStepLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  genProgressTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden' as const,
    marginBottom: Spacing.lg,
  },
  genProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  genDoneWrap: {
    backgroundColor: Colors.primary + '18',
  },
  genTimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    fontVariant: ['tabular-nums'] as any,
  },

  // Summary screen (done state)
  summaryScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  summaryMessage: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.surfaceLight,
  },
  summaryStatValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'] as any,
  },
  summaryStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  summaryStatDate: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCtaText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
});
