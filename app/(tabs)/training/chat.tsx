/**
 * Plan chat screen — conversational AI for adjusting the training plan.
 * Features contextual quick-action chips that adapt to the user's plan state.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useTrainingPlan } from '../../../src/contexts/TrainingPlanContext';
import { adjustPlan, applyPlanModifications } from '../../../src/ai/planService';
import { supabase } from '../../../src/analytics/supabaseClient';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';

// ── Types ────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modificationsApplied?: boolean;
}

interface QuickChip {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  prompt: string;
}

// ── Day helpers ──────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayOfWeekName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - now.getTime()) / (86400000));
}

// ── Quick chip builder ───────────────────────────────────────

function buildQuickChips(
  plan: { race_date: string; race_type: string; start_date: string; days_per_week: number },
  planWorkouts: { date: string; status: string; day_label: string | null }[],
): QuickChip[] {
  const chips: QuickChip[] = [];
  const today = todayKey();
  const tomorrow = tomorrowKey();
  const yesterday = yesterdayKey();

  // ── Contextual chips (order matters — most relevant first) ──

  // Missed recent workouts (yesterday or earlier this week, still 'planned')
  const recentMissed = planWorkouts.filter(
    (w) => w.status === 'planned' && w.date < today && w.date >= yesterday,
  );
  if (recentMissed.length > 0) {
    const missedDay = dayOfWeekName(recentMissed[recentMissed.length - 1].date);
    chips.push({
      icon: 'alert-circle-outline',
      label: `Missed ${missedDay}`,
      prompt: `I missed my ${missedDay} run. Can you adjust the rest of my schedule?`,
    });
  }

  // Tomorrow has a workout — offer to lighten it
  const tomorrowWorkout = planWorkouts.find((w) => w.date === tomorrow && w.status === 'planned');
  if (tomorrowWorkout) {
    chips.push({
      icon: 'bed-outline',
      label: 'Easier tomorrow',
      prompt: "I'm feeling tired. Can you make tomorrow's workout easier?",
    });
  }

  // Race proximity
  const daysToRace = daysUntil(plan.race_date);
  if (daysToRace > 0 && daysToRace <= 14 && plan.race_type !== 'custom') {
    chips.push({
      icon: 'flag-outline',
      label: 'Help me taper',
      prompt: `My race is in ${daysToRace} days. Help me taper properly.`,
    });
  }

  // ── Universal chips ──

  chips.push({
    icon: 'trending-down-outline',
    label: 'Easier week',
    prompt: 'This week is too much. Can you make it easier?',
  });

  chips.push({
    icon: 'add-circle-outline',
    label: 'More running days',
    prompt: `I want to add another running day each week. I currently run ${plan.days_per_week} days.`,
  });

  chips.push({
    icon: 'swap-horizontal-outline',
    label: 'Swap days',
    prompt: "Can you swap my workout days around? I need more flexibility with my schedule.",
  });

  chips.push({
    icon: 'calendar-outline',
    label: 'Race date changed',
    prompt: 'My race date got moved. Can you adjust my plan timeline?',
  });

  chips.push({
    icon: 'heart-outline',
    label: 'Ease back in',
    prompt: "I'm recovering from illness and haven't run in a while. Help me ease back in safely.",
  });

  chips.push({
    icon: 'trending-up-outline',
    label: 'Push me harder',
    prompt: "The plan feels too easy. Can you increase the intensity?",
  });

  return chips;
}

// ── Welcome message ──────────────────────────────────────────

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "I'm your AI coach. Tap a suggestion below or type anything to adjust your training plan.",
  timestamp: Date.now(),
};

// ── Message bubble ───────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
        {message.modificationsApplied && (
          <View style={styles.appliedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.appliedText}>Changes applied to your plan</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────

export default function PlanChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { plan, planWorkouts, refresh } = useTrainingPlan();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Build contextual quick chips based on current plan state
  const quickChips = useMemo(() => {
    if (!plan) return [];
    return buildQuickChips(plan, planWorkouts);
  }, [plan, planWorkouts]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !plan || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    Keyboard.dismiss();
    setLoading(true);

    try {
      const totalWeeks = Math.max(1, Math.ceil(
        (new Date(plan.race_date).getTime() - new Date(plan.start_date).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
      ));

      const { data: profileData } = await supabase
        .from('running_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const conversationHistory = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await adjustPlan({
        prompt: userMessage.content,
        planSummary: {
          title: plan.title,
          raceType: plan.race_type,
          raceDate: plan.race_date,
          startDate: plan.start_date,
          daysPerWeek: plan.days_per_week,
          totalWeeks,
          workouts: planWorkouts.map((w) => ({
            date: w.date,
            day_label: w.day_label ?? '',
            status: w.status,
            week_number: w.week_number,
          })),
        },
        profile: profileData ? {
          experience_level: profileData.experience_level,
          typical_run_minutes: profileData.typical_run_minutes,
          easy_pace: profileData.easy_pace,
          fast_pace: profileData.fast_pace,
        } : undefined,
        conversation: conversationHistory,
      });

      if (result.modifications && result.modifications.length > 0) {
        await applyPlanModifications(plan.id, result.modifications);
        await refresh();
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message,
        timestamp: Date.now(),
        modificationsApplied: result.modifications && result.modifications.length > 0,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${err.message || 'Please try again.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [loading, plan, planWorkouts, messages, user, refresh]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleChipPress = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  if (!plan) {
    return (
      <View style={styles.centered}>
        <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Active Plan</Text>
        <Text style={styles.emptyText}>
          Create a training plan first, then come back to adjust it.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      )}

      {/* Quick-action chips */}
      {!loading && quickChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {quickChips.map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={styles.chip}
              onPress={() => handleChipPress(chip.prompt)}
              activeOpacity={0.7}
            >
              <Ionicons name={chip.icon} size={12} color={Colors.accent} />
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask to adjust your plan..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={18} color={Colors.black} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  messageList: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  bubbleRow: {
    marginBottom: Spacing.sm,
    alignItems: 'flex-start',
  },
  bubbleRowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bubbleUser: {
    backgroundColor: Colors.primary + '20',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: Colors.textPrimary,
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  appliedText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },

  // Quick-action chips
  chipsRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
