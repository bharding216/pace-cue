/**
 * Plan chat screen — conversational AI for adjusting the training plan.
 * Reuses patterns from ai-builder.tsx.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modificationsApplied?: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'How can I adjust your training plan? You can ask me things like:\n\n• "I have a work trip next week, lighten those days"\n• "Make the long runs shorter for the first month"\n• "I missed this week, how should I adjust?"\n• "Swap Tuesday and Thursday workouts"',
  timestamp: Date.now(),
};

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

export default function PlanChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { plan, planWorkouts, refresh } = useTrainingPlan();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !plan || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    Keyboard.dismiss();
    setLoading(true);

    try {
      // Build plan summary for the edge function
      const totalWeeks = Math.max(1, Math.ceil(
        (new Date(plan.race_date).getTime() - new Date(plan.start_date).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
      ));

      // Load running profile
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

      // Apply modifications
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
  }, [input, loading, plan, planWorkouts, messages, user, refresh]);

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
