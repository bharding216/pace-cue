/**
 * Running Profile settings — goals, experience level, pace info,
 * and preferences that feed into the AI workout builder.
 *
 * Requires an authenticated user (data is stored in Supabase).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/analytics/supabaseClient';
import {
  RunningProfile,
  RunningPreference,
  RunningPreferenceCategory,
  ExperienceLevel,
  RaceTimes,
  RaceTimeEntry,
} from '../../../src/types/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import { hapticTap } from '../../../src/audio/haptics';

// ── Presets ──────────────────────────────────────────────────

const GOAL_PRESETS = [
  'Run a faster 5K',
  'Train for a 10K',
  'Half marathon prep',
  'Marathon training',
  'Get faster overall',
  'Build endurance',
  'Couch to 5K',
  'Improve VO2 max',
  'General fitness',
  'Lose weight while running',
];

const PREFERENCE_PRESETS = [
  'Keep workouts under 30 minutes',
  'Keep workouts under 45 minutes',
  'I prefer shorter, intense intervals',
  'I prefer longer tempo efforts',
  'Include walking recovery',
  'Include hill work',
  'No walking — jog recovery only',
  'Focus on negative splits',
  'I like progressive builds',
  'Minimal warmup / cooldown',
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'New to intervals or running < 6 months' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Running 6+ months, comfortable with intervals' },
  { value: 'advanced', label: 'Advanced', desc: 'Experienced runner, training seriously' },
];

const DURATION_PRESETS = [
  { label: '20–30 min', min: 20, max: 30 },
  { label: '30–45 min', min: 30, max: 45 },
  { label: '45–60 min', min: 45, max: 60 },
  { label: '60–90 min', min: 60, max: 90 },
];

// ── Pace helpers (decimal ↔ MM:SS) ──────────────────────────

/** Convert decimal minutes (e.g. 8.5) → "8:30" */
function paceToMMSS(decimal: number): string {
  const mins = Math.floor(decimal);
  const secs = Math.round((decimal - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Convert "8:30" → 8.5, or return null if invalid */
function mmSSToPace(text: string): number | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs >= 60) return null;
  const decimal = mins + secs / 60;
  return decimal > 0 ? parseFloat(decimal.toFixed(2)) : null;
}

// ── Race time helpers ────────────────────────────────────────

/** Convert total seconds → display string (M:SS, MM:SS, or H:MM:SS) */
function secondsToDisplay(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Parse "M:SS", "MM:SS", or "H:MM:SS" → total seconds, or null if invalid */
function displayToSeconds(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // H:MM:SS
  const hms = trimmed.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (hms) {
    const h = parseInt(hms[1], 10);
    const m = parseInt(hms[2], 10);
    const s = parseInt(hms[3], 10);
    if (m >= 60 || s >= 60) return null;
    const total = h * 3600 + m * 60 + s;
    return total > 0 ? total : null;
  }

  // M:SS or MM:SS
  const ms = trimmed.match(/^(\d{1,3}):(\d{1,2})$/);
  if (ms) {
    const m = parseInt(ms[1], 10);
    const s = parseInt(ms[2], 10);
    if (s >= 60) return null;
    const total = m * 60 + s;
    return total > 0 ? total : null;
  }

  return null;
}

const RACE_DISTANCES: { key: string; label: string; placeholder: string }[] = [
  { key: 'mile', label: 'Mile', placeholder: 'e.g. 8:00' },
  { key: '5k', label: '5K', placeholder: 'e.g. 25:00' },
  { key: '10k', label: '10K', placeholder: 'e.g. 52:00' },
  { key: 'half_marathon', label: 'Half Marathon', placeholder: 'e.g. 1:55:00' },
  { key: 'marathon', label: 'Marathon', placeholder: 'e.g. 4:00:00' },
];

const PACE_TIERS: { key: keyof RaceTimeEntry; label: string }[] = [
  { key: 'slow', label: 'Slow' },
  { key: 'avg', label: 'Avg' },
  { key: 'fast', label: 'Fast' },
];

// ── Race Time Row ───────────────────────────────────────────

function RaceTimeRow({
  distance,
  entry,
  onChange,
}: {
  distance: { key: string; label: string; placeholder: string };
  entry: RaceTimeEntry;
  onChange: (tier: keyof RaceTimeEntry, seconds: number | null) => void;
}) {
  const [texts, setTexts] = useState<Record<string, string>>({
    slow: entry.slow != null ? secondsToDisplay(entry.slow) : '',
    avg: entry.avg != null ? secondsToDisplay(entry.avg) : '',
    fast: entry.fast != null ? secondsToDisplay(entry.fast) : '',
  });

  const handleBlur = (tier: keyof RaceTimeEntry) => {
    const text = texts[tier]?.trim();
    if (!text) {
      onChange(tier, null);
      return;
    }
    const secs = displayToSeconds(text);
    if (secs != null) {
      onChange(tier, secs);
      setTexts((prev) => ({ ...prev, [tier]: secondsToDisplay(secs) }));
    } else {
      Alert.alert('Invalid time', `Enter time as M:SS, MM:SS, or H:MM:SS`);
    }
  };

  return (
    <View style={styles.raceTimeRow}>
      <Text style={styles.raceTimeLabel}>{distance.label}</Text>
      <View style={styles.raceTimeFields}>
        {PACE_TIERS.map((tier) => (
          <View key={tier.key} style={styles.raceTimeFieldWrap}>
            <Text style={styles.raceTimeTierLabel}>{tier.label}</Text>
            <TextInput
              style={styles.raceTimeField}
              value={texts[tier.key]}
              onChangeText={(v) => setTexts((prev) => ({ ...prev, [tier.key]: v }))}
              onBlur={() => handleBlur(tier.key)}
              onSubmitEditing={() => handleBlur(tier.key)}
              placeholder={distance.placeholder}
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Preference Section ──────────────────────────────────────

function PreferenceSection({
  title,
  category,
  items,
  userId,
  onChanged,
  presets,
}: {
  title: string;
  category: RunningPreferenceCategory;
  items: RunningPreference[];
  userId: string;
  onChanged: () => void;
  presets: string[];
}) {
  const [newItem, setNewItem] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const existingContent = new Set(items.map((i) => i.content));
  const availablePresets = presets.filter((p) => !existingContent.has(p));

  const addItem = async (content?: string) => {
    const value = (content ?? newItem).trim();
    if (!value) return;
    const { error } = await supabase.from('running_preferences').insert({
      user_id: userId,
      content: value,
      category,
    });
    if (error) Alert.alert('Error', error.message);
    else {
      setNewItem('');
      onChanged();
    }
  };

  const removeItem = async (id: string) => {
    await supabase.from('running_preferences').delete().eq('id', id);
    onChanged();
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {availablePresets.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowPresets((p) => !p)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionsToggle}>
              {showPresets ? 'Hide suggestions' : 'Suggestions'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showPresets && availablePresets.length > 0 && (
        <View style={[styles.chipRow, { marginBottom: Spacing.sm }]}>
          {availablePresets.map((p) => (
            <TouchableOpacity
              key={p}
              style={styles.chip}
              onPress={() => addItem(p)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>+ {p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {items.map((item) => (
        <View key={item.id} style={styles.prefRow}>
          <Text style={styles.prefText}>{item.content}</Text>
          <TouchableOpacity
            onPress={() => removeItem(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={newItem}
          onChangeText={setNewItem}
          placeholder={`Add custom ${title.toLowerCase().replace(/s$/, '')}…`}
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={() => addItem()}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => addItem()}>
          <Ionicons name="add" size={20} color={Colors.black} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────

export default function RunningProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<RunningProfile | null>(null);
  const [preferences, setPreferences] = useState<RunningPreference[]>([]);
  const [loading, setLoading] = useState(true);

  // Local state for pace text fields (saved on blur, not every keystroke)
  const [easyPaceText, setEasyPaceText] = useState('');
  const [fastPaceText, setFastPaceText] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;

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
    setEasyPaceText(profileData?.easy_pace != null ? paceToMMSS(profileData.easy_pace) : '');
    setFastPaceText(profileData?.fast_pace != null ? paceToMMSS(profileData.fast_pace) : '');
    setPreferences(prefData ?? []);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const updateProfile = async (updates: Partial<RunningProfile>) => {
    if (!user) return;

    // Optimistic update so UI responds instantly
    setProfile((prev) =>
      prev
        ? { ...prev, ...updates }
        : ({
            id: '',
            user_id: user.id,
            experience_level: 'beginner' as ExperienceLevel,
            typical_run_minutes: null,
            typical_run_minutes_max: null,
            easy_pace: null,
            fast_pace: null,
            race_times: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...updates,
          } as RunningProfile),
    );

    const { error } = profile
      ? await supabase
          .from('running_profiles')
          .update(updates)
          .eq('user_id', user.id)
      : await supabase.from('running_profiles').insert({
          user_id: user.id,
          ...updates,
        });

    if (error) {
      Alert.alert('Error', error.message);
    }
    // Sync with DB to get the canonical row (including generated id / timestamps)
    fetchData();
  };

  const savePace = (field: 'easy_pace' | 'fast_pace', text: string) => {
    const trimmed = text.trim();
    if (trimmed === '') {
      updateProfile({ [field]: null });
      return;
    }
    const decimal = mmSSToPace(trimmed);
    if (decimal != null) {
      updateProfile({ [field]: decimal });
    } else {
      Alert.alert('Invalid pace', 'Enter pace as M:SS or MM:SS (e.g. 8:30)');
    }
  };

  const updateRaceTime = (distanceKey: string, tier: keyof RaceTimeEntry, seconds: number | null) => {
    const current: RaceTimes = profile?.race_times ?? {};
    const entry = current[distanceKey] ?? { slow: null, avg: null, fast: null };
    const updated: RaceTimes = {
      ...current,
      [distanceKey]: { ...entry, [tier]: seconds },
    };
    updateProfile({ race_times: updated } as Partial<RunningProfile>);
  };

  if (!user) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContent}
      >
        <View style={styles.emptyHero}>
          <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Your Running Profile</Text>
          <Text style={styles.emptyText}>
            Set your goals, experience level, and training preferences so our
            AI can create workouts designed to help you meet your goals.
          </Text>
        </View>

        <View style={styles.emptyFeatures}>
          {[
            { icon: 'fitness-outline' as const, text: 'Experience level & typical run duration' },
            { icon: 'speedometer-outline' as const, text: 'Easy and fast pace targets' },
            { icon: 'trophy-outline' as const, text: 'Personal running goals' },
            { icon: 'options-outline' as const, text: 'Training style preferences' },
          ].map((item) => (
            <View key={item.text} style={styles.emptyFeatureRow}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
              <Text style={styles.emptyFeatureText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.signInButtonText}>Sign In to Get Started</Text>
        </TouchableOpacity>

        <Text style={styles.emptyFooter}>
          Sign in to save your profile and unlock AI-powered workouts.
        </Text>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const goals = preferences.filter((p) => p.category === 'goal');
  const prefs = preferences.filter((p) => p.category === 'preference');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Experience Level */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience Level</Text>
        <View style={styles.levelRow}>
          {EXPERIENCE_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.levelCard,
                profile?.experience_level === level.value &&
                  styles.levelCardActive,
              ]}
              onPress={() => {
                hapticTap();
                updateProfile({ experience_level: level.value });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.levelLabel,
                  profile?.experience_level === level.value &&
                    styles.levelLabelActive,
                ]}
              >
                {level.label}
              </Text>
              <Text style={styles.levelDesc}>{level.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Typical Run Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Typical Run Duration</Text>
        <Text style={styles.sectionSub}>
          How long are your usual runs? Pick a preset or enter a custom range.
        </Text>
        <View style={styles.chipRow}>
          {DURATION_PRESETS.map((preset) => {
            const isActive =
              profile?.typical_run_minutes === preset.min &&
              profile?.typical_run_minutes_max === preset.max;
            return (
              <TouchableOpacity
                key={preset.label}
                style={[styles.durationChip, isActive && styles.durationChipActive]}
                onPress={() => {
                  hapticTap();
                  updateProfile({
                    typical_run_minutes: preset.min,
                    typical_run_minutes_max: preset.max,
                  } as Partial<RunningProfile>);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.durationChipText, isActive && styles.durationChipTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.durationRangeRow}>
          <TextInput
            style={styles.durationField}
            value={profile?.typical_run_minutes != null ? String(profile.typical_run_minutes) : ''}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!v.trim()) updateProfile({ typical_run_minutes: null } as Partial<RunningProfile>);
              else if (!isNaN(n) && n > 0) updateProfile({ typical_run_minutes: n } as Partial<RunningProfile>);
            }}
            placeholder="Min"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.durationDash}>–</Text>
          <TextInput
            style={styles.durationField}
            value={profile?.typical_run_minutes_max != null ? String(profile.typical_run_minutes_max) : ''}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!v.trim()) updateProfile({ typical_run_minutes_max: null } as Partial<RunningProfile>);
              else if (!isNaN(n) && n > 0) updateProfile({ typical_run_minutes_max: n } as Partial<RunningProfile>);
            }}
            placeholder="Max"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.durationUnit}>minutes</Text>
        </View>
      </View>

      {/* Pace Range */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Paces (min/mile)</Text>
        <Text style={styles.sectionSub}>
          Enter as minutes:seconds — e.g. 9:30 means 9 min 30 sec per mile.
        </Text>
        <View style={styles.paceRow}>
          <View style={styles.paceInput}>
            <Text style={styles.paceLabel}>Easy pace</Text>
            <TextInput
              style={styles.paceField}
              value={easyPaceText}
              onChangeText={setEasyPaceText}
              onBlur={() => savePace('easy_pace', easyPaceText)}
              onSubmitEditing={() => savePace('easy_pace', easyPaceText)}
              placeholder="e.g. 10:00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
          </View>
          <View style={styles.paceInput}>
            <Text style={styles.paceLabel}>Fast pace</Text>
            <TextInput
              style={styles.paceField}
              value={fastPaceText}
              onChangeText={setFastPaceText}
              onBlur={() => savePace('fast_pace', fastPaceText)}
              onSubmitEditing={() => savePace('fast_pace', fastPaceText)}
              placeholder="e.g. 7:30"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
          </View>
        </View>
      </View>

      {/* Race Times */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Race Times</Text>
        <Text style={styles.sectionSub}>
          Know your times? Fill in any you have — even just one helps the AI
          calibrate your plan. Enter as M:SS, MM:SS, or H:MM:SS.
        </Text>
        {RACE_DISTANCES.map((dist) => (
          <RaceTimeRow
            key={dist.key}
            distance={dist}
            entry={profile?.race_times?.[dist.key] ?? { slow: null, avg: null, fast: null }}
            onChange={(tier, seconds) => updateRaceTime(dist.key, tier, seconds)}
          />
        ))}
      </View>

      {/* Goals */}
      <PreferenceSection
        title="Goals"
        category="goal"
        items={goals}
        userId={user.id}
        onChanged={fetchData}
        presets={GOAL_PRESETS}
      />

      {/* Preferences */}
      <PreferenceSection
        title="Training Preferences"
        category="preference"
        items={prefs}
        userId={user.id}
        onChanged={fetchData}
        presets={PREFERENCE_PRESETS}
      />
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
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
  },
  emptyHero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyFeatures: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  emptyFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyFeatureText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    flex: 1,
  },
  signInButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    alignSelf: 'stretch',
  },
  signInButtonText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyFooter: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  suggestionsToggle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Experience level
  levelRow: {
    gap: Spacing.sm,
  },
  levelCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
  },
  levelCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  levelLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  levelLabelActive: {
    color: Colors.primary,
  },
  levelDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Duration chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  durationChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
  },
  durationChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  durationChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  durationChipTextActive: {
    color: Colors.primary,
  },
  durationRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  durationField: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  durationDash: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  durationUnit: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Pace
  paceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  paceInput: {
    flex: 1,
  },
  paceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  paceField: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },

  // Race times
  raceTimeRow: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  raceTimeLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  raceTimeFields: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  raceTimeFieldWrap: {
    flex: 1,
  },
  raceTimeTierLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  raceTimeField: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },

  // Preference chips
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  chipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // Preference list
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  prefText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
