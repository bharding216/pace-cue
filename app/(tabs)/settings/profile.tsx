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
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/analytics/supabaseClient';
import {
  RunningProfile,
  RunningPreference,
  RunningPreferenceCategory,
  ExperienceLevel,
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

const DURATION_OPTIONS = [20, 30, 45, 60, 90];

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
        <View style={styles.chipRow}>
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<RunningProfile | null>(null);
  const [preferences, setPreferences] = useState<RunningPreference[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [{ data: profileData }, { data: prefData }] = await Promise.all([
      supabase
        .from('running_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('running_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at'),
    ]);

    setProfile(profileData);
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

    if (profile) {
      await supabase
        .from('running_profiles')
        .update(updates)
        .eq('user_id', user.id);
    } else {
      await supabase.from('running_profiles').insert({
        user_id: user.id,
        ...updates,
      });
    }
    fetchData();
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Sign in to set up your profile</Text>
        <Text style={styles.emptyText}>
          Your running profile helps the AI build better workouts for you.
        </Text>
      </View>
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
        <View style={styles.chipRow}>
          {DURATION_OPTIONS.map((min) => (
            <TouchableOpacity
              key={min}
              style={[
                styles.durationChip,
                profile?.typical_run_minutes === min &&
                  styles.durationChipActive,
              ]}
              onPress={() => {
                hapticTap();
                updateProfile({ typical_run_minutes: min });
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.durationChipText,
                  profile?.typical_run_minutes === min &&
                    styles.durationChipTextActive,
                ]}
              >
                {min} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pace Range */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Paces (min/mile)</Text>
        <Text style={styles.sectionSub}>
          Helps the AI set realistic target paces for your intervals.
        </Text>
        <View style={styles.paceRow}>
          <View style={styles.paceInput}>
            <Text style={styles.paceLabel}>Easy pace</Text>
            <TextInput
              style={styles.paceField}
              value={
                profile?.easy_pace != null
                  ? String(profile.easy_pace)
                  : ''
              }
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!isNaN(num)) updateProfile({ easy_pace: num });
              }}
              placeholder="e.g. 10.0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
          <View style={styles.paceInput}>
            <Text style={styles.paceLabel}>Fast pace</Text>
            <TextInput
              style={styles.paceField}
              value={
                profile?.fast_pace != null
                  ? String(profile.fast_pace)
                  : ''
              }
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!isNaN(num)) updateProfile({ fast_pace: num });
              }}
              placeholder="e.g. 7.5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
        </View>
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
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
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
