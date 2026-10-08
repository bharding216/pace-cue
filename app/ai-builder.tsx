/**
 * AI Workout Builder — chat-based interface for generating workouts.
 *
 * Presented as a full-screen modal. Users chat with the AI to describe
 * the workout they want, and the AI returns a WorkoutDefinition that
 * can be saved to their library.
 *
 * The "save" action is what counts as a metered AI generation.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import { supabase } from '../src/analytics/supabaseClient';
import {
  generateWorkout,
  ChatMessage,
  AIContext,
} from '../src/ai/aiWorkoutService';
import {
  WorkoutDefinition,
  flattenWorkout,
  formatTime,
  totalWorkoutSeconds,
} from '../src/workout/workoutTypes';
import { saveWorkout } from '../src/workout/workoutStorage';
import { track } from '../src/analytics/track';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  intervalColor,
} from '../src/constants/theme';

// ── Inline Workout Preview ──────────────────────────────────

function WorkoutPreview({
  workout,
  onSave,
  saving,
}: {
  workout: WorkoutDefinition;
  onSave: () => void;
  saving: boolean;
}) {
  const intervals = flattenWorkout(workout);
  const totalSecs = totalWorkoutSeconds(workout);

  return (
    <View style={previewStyles.container}>
      <Text style={previewStyles.name}>{workout.name}</Text>
      <Text style={previewStyles.summary}>
        {formatTime(totalSecs)} · {intervals.length} interval
        {intervals.length !== 1 ? 's' : ''}
      </Text>

      <View style={previewStyles.dots}>
        {intervals.slice(0, 30).map((int, i) => (
          <View
            key={i}
            style={[
              previewStyles.dot,
              { backgroundColor: intervalColor(int.type) },
            ]}
          />
        ))}
        {intervals.length > 30 && (
          <Text style={previewStyles.moreText}>+{intervals.length - 30}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[previewStyles.saveBtn, saving && previewStyles.saveBtnDisabled]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={Colors.black} size="small" />
        ) : (
          <>
            <Ionicons name="add-circle" size={18} color={Colors.black} />
            <Text style={previewStyles.saveBtnText}>Save to My Workouts</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    alignSelf: 'center',
    marginLeft: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.black,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});

// ── Chat Message Bubble ─────────────────────────────────────

function MessageBubble({
  message,
  onSaveWorkout,
  saving,
}: {
  message: ChatMessage;
  onSaveWorkout: (workout: WorkoutDefinition) => void;
  saving: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        bubbleStyles.container,
        isUser ? bubbleStyles.userContainer : bubbleStyles.assistantContainer,
      ]}
    >
      <View
        style={[
          bubbleStyles.bubble,
          isUser ? bubbleStyles.userBubble : bubbleStyles.assistantBubble,
        ]}
      >
        <Text
          style={[
            bubbleStyles.text,
            isUser ? bubbleStyles.userText : bubbleStyles.assistantText,
          ]}
        >
          {message.content}
        </Text>
      </View>

      {message.workout && (
        <WorkoutPreview
          workout={message.workout}
          onSave={() => onSaveWorkout(message.workout!)}
          saving={saving}
        />
      )}
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Spacing.xs,
  },
  text: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  userText: {
    color: Colors.black,
  },
  assistantText: {
    color: Colors.textPrimary,
  },
});

// ── Main Screen ─────────────────────────────────────────────

export default function AIBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { canUseAI, aiWorkoutsUsed, aiWorkoutsLimit, tier, incrementAIUsage } =
    useSubscription();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiContext, setAiContext] = useState<AIContext | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Load running profile context on mount
  useEffect(() => {
    if (!user) return;

    const loadContext = async () => {
      const [{ data: profile }, { data: prefs }] = await Promise.all([
        supabase
          .from('running_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('running_preferences')
          .select('content, category')
          .eq('user_id', user.id),
      ]);

      setAiContext({
        experienceLevel: profile?.experience_level,
        typicalRunMinutes: profile?.typical_run_minutes,
        easyPace: profile?.easy_pace,
        fastPace: profile?.fast_pace,
        goals: (prefs ?? [])
          .filter((p: any) => p.category === 'goal')
          .map((p: any) => p.content),
        preferences: (prefs ?? [])
          .filter((p: any) => p.category === 'preference')
          .map((p: any) => p.content),
      });
    };

    loadContext();
  }, [user]);

  // Show welcome message
  useEffect(() => {
    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hey! 👋 I\'m your AI workout builder. Tell me what kind of interval workout you want and I\'ll create it for you.\n\nTry something like:\n• "30 minute tempo run"\n• "Speed work with 400m repeats"\n• "Easy beginner intervals"',
      timestamp: Date.now(),
    };
    setMessages([welcome]);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || generating) return;

    if (!canUseAI) {
      router.push('/paywall' as any);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setGenerating(true);

    try {
      const response = await generateWorkout(
        text,
        aiContext ?? { goals: [], preferences: [] },
        messages.filter((m) => m.id !== 'welcome'),
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        workout: response.workout,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't generate that workout. ${err.message ?? 'Please try again.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setGenerating(false);
    }
  }, [input, generating, canUseAI, aiContext, messages, router]);

  const handleSaveWorkout = useCallback(
    async (workout: WorkoutDefinition) => {
      setSaving(true);
      try {
        await saveWorkout(workout);
        await incrementAIUsage();

        track('ai_workout_saved', {
          workout_id: workout.id,
          workout_name: workout.name,
        });

        Alert.alert(
          'Workout Saved! 🎉',
          `"${workout.name}" has been added to your workouts.`,
          [
            { text: 'Keep Chatting', style: 'cancel' },
            {
              text: 'Go to Workouts',
              onPress: () => router.replace('/(tabs)'),
            },
          ],
        );
      } catch (err: any) {
        Alert.alert('Save Failed', err.message ?? 'Something went wrong.');
      } finally {
        setSaving(false);
      }
    },
    [incrementAIUsage, router],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>AI Builder</Text>
        </View>
        <View style={styles.headerRight}>
          {tier === 'free' && aiWorkoutsLimit != null && (
            <Text style={styles.usageBadge}>
              {aiWorkoutsUsed}/{aiWorkoutsLimit}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            onSaveWorkout={handleSaveWorkout}
            saving={saving}
          />
        )}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListFooterComponent={
          generating ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.typingText}>Building your workout…</Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            canUseAI
              ? 'Describe your ideal workout…'
              : 'Upgrade to Pro for unlimited AI workouts'
          }
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          editable={!generating}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!input.trim() || generating) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || generating}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={
              input.trim() && !generating
                ? Colors.black
                : Colors.textMuted
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
    backgroundColor: Colors.background,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  usageBadge: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  messagesList: {
    paddingVertical: Spacing.md,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  typingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
});
