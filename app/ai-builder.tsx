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
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import { useAIBuilder } from '../src/contexts/AIBuilderContext';
import { supabase } from '../src/analytics/supabaseClient';
import {
  generateWorkout,
  ChatMessage,
} from '../src/ai/aiWorkoutService';
import {
  WorkoutDefinition,
  WorkoutRepeatBlock,
  WorkoutInterval,
  flattenWorkout,
  formatTime,
  totalWorkoutSeconds,
} from '../src/workout/workoutTypes';
import { formatPaceDisplay } from '../src/pace/paceTracker';
import { WorkoutEditorForm } from '../src/components/WorkoutEditorForm';
import { saveWorkout } from '../src/workout/workoutStorage';
import { track } from '../src/analytics/track';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  intervalColor,
} from '../src/constants/theme';

// ── Helpers ─────────────────────────────────────────────────

function intervalLabel(interval: WorkoutInterval): string {
  if (interval.label) return interval.label;
  switch (interval.type) {
    case 'warmup': return 'Warm Up';
    case 'cooldown': return 'Cool Down';
    case 'hard': return 'Hard';
    case 'easy': return 'Easy';
  }
}

function effortPreviewColor(effort: number): string {
  if (effort <= 3) return Colors.accent;
  if (effort <= 6) return '#F59E0B';
  if (effort <= 8) return '#F97316';
  return Colors.danger;
}

// ── Section Preview (warmup / intervals / cooldown) ─────────

function SectionPreview({
  label,
  blocks,
}: {
  label: string;
  blocks: WorkoutRepeatBlock[];
}) {
  if (blocks.length === 0) return null;

  // Determine which optional columns are needed across all intervals
  const allIntervals = blocks.flatMap((b) => b.intervals);
  const hasEffort = allIntervals.some((i) => i.effort != null);
  const hasPace = allIntervals.some((i) => i.targetPace != null);

  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.label}>{label}</Text>

      {/* Column headers */}
      <View style={sectionStyles.colHeaderRow}>
        <View style={sectionStyles.colHeaderSpacer} />
        <Text style={sectionStyles.colHeaderName}>Interval</Text>
        <View style={sectionStyles.intervalMeta}>
          <Text style={[sectionStyles.colHeader, { minWidth: 40 }]}>
            Length
          </Text>
          {hasEffort && (
            <Text style={[sectionStyles.colHeader, { minWidth: 30 }]}>
              Effort
            </Text>
          )}
          {hasPace && (
            <Text style={[sectionStyles.colHeader, { minWidth: 52 }]}>
              Pace
            </Text>
          )}
        </View>
      </View>

      {blocks.map((block, bi) => (
        <View key={bi} style={sectionStyles.block}>
          {(blocks.length > 1 || block.repeatCount > 1 || block.name) && (
            <View style={sectionStyles.blockHeader}>
              {block.name ? (
                <Text style={sectionStyles.blockName}>{block.name}</Text>
              ) : blocks.length > 1 ? (
                <Text style={sectionStyles.blockName}>Block {bi + 1}</Text>
              ) : null}
              {block.repeatCount > 1 && (
                <View style={sectionStyles.repeatBadge}>
                  <Text style={sectionStyles.repeatText}>×{block.repeatCount}</Text>
                </View>
              )}
            </View>
          )}
          {block.intervals.map((interval, ii) => (
            <View key={ii} style={sectionStyles.intervalRow}>
              <View
                style={[
                  sectionStyles.dot,
                  { backgroundColor: intervalColor(interval.type) },
                ]}
              />
              <Text style={sectionStyles.intervalName} numberOfLines={1}>
                {intervalLabel(interval)}
              </Text>
              <View style={sectionStyles.intervalMeta}>
                <Text style={sectionStyles.intervalDuration}>
                  {formatTime(interval.durationSeconds)}
                </Text>
                {hasEffort && (
                  <Text
                    style={[
                      sectionStyles.effort,
                      interval.effort != null
                        ? { color: effortPreviewColor(interval.effort) }
                        : { color: Colors.textMuted },
                    ]}
                  >
                    {interval.effort != null ? `${interval.effort}/10` : '—'}
                  </Text>
                )}
                {hasPace && (
                  <Text
                    style={[
                      sectionStyles.pace,
                      interval.targetPace == null && { color: Colors.textMuted },
                    ]}
                  >
                    {interval.targetPace != null
                      ? `${formatPaceDisplay(interval.targetPace)}/mi`
                      : '—'}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  colHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  colHeaderSpacer: {
    width: 8,
  },
  colHeaderName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  block: {
    backgroundColor: Colors.background + '80',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  blockName: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  repeatBadge: {
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  repeatText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  intervalName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  intervalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  intervalDuration: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
  effort: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
  },
  pace: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.accent,
    minWidth: 52,
    textAlign: 'right',
  },
});

// ── Inline Workout Preview ──────────────────────────────────

function WorkoutPreview({
  workout,
  onSave,
  onEdit,
  saving,
}: {
  workout: WorkoutDefinition;
  onSave: () => void;
  onEdit: () => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const intervals = flattenWorkout(workout);
  const totalSecs = totalWorkoutSeconds(workout);

  return (
    <View style={previewStyles.container}>
      {/* Collapsible header */}
      <TouchableOpacity
        style={previewStyles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={previewStyles.headerLeft}>
          <Text style={previewStyles.name}>{workout.name}</Text>
          <Text style={previewStyles.summary}>
            {formatTime(totalSecs)} · {intervals.length} interval
            {intervals.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Detailed interval breakdown */}
      {expanded && (
        <View style={previewStyles.details}>
          <SectionPreview label="WARM UP" blocks={workout.warmup} />
          <SectionPreview label="INTERVALS" blocks={workout.blocks} />
          <SectionPreview label="COOL DOWN" blocks={workout.cooldown} />
        </View>
      )}

      {/* Collapsed dot summary */}
      {!expanded && (
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
      )}

      {/* Action buttons */}
      <View style={previewStyles.actions}>
        <TouchableOpacity
          style={previewStyles.editBtn}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color={Colors.accent} />
          <Text style={previewStyles.editBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            previewStyles.saveBtn,
            saving && previewStyles.saveBtnDisabled,
          ]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={Colors.black} size="small" />
          ) : (
            <>
              <Ionicons name="add-circle" size={16} color={Colors.black} />
              <Text style={previewStyles.saveBtnText}>Save to My Workouts</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={previewStyles.hint}>
        💡 Ask me to adjust anything, or tap Edit to tweak manually
      </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
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
  details: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    paddingTop: Spacing.sm,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  editBtnText: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
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
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
});

// ── Chat Message Bubble ─────────────────────────────────────

function MessageBubble({
  message,
  onSaveWorkout,
  onEditWorkout,
  saving,
}: {
  message: ChatMessage;
  onSaveWorkout: (workout: WorkoutDefinition) => void;
  onEditWorkout: (workout: WorkoutDefinition) => void;
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
          onEdit={() => onEditWorkout(message.workout!)}
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
  const {
    messages,
    setMessages,
    aiContext,
    setAiContext,
    clearConversation,
    loadingConversation,
  } = useAIBuilder();

  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<{
    messageId: string;
    workout: WorkoutDefinition;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Load running profile context on mount (only if not already loaded)
  useEffect(() => {
    if (!user || aiContext) return;

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

  // Track keyboard height (includes suggestion bar) so we can
  // manually offset the input — KeyboardAvoidingView breaks in modals.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll to end when the screen opens with existing messages
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
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

  const handleEditSave = useCallback(
    async (messageId: string, updatedWorkout: WorkoutDefinition) => {
      // Update the preview in the chat
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, workout: { ...updatedWorkout, updatedAt: Date.now() } }
            : m,
        ),
      );
      // Actually persist the workout + count against AI quota
      await handleSaveWorkout(updatedWorkout);
    },
    [handleSaveWorkout, setMessages],
  );

  const handleEditWorkout = useCallback(
    (messageId: string, workout: WorkoutDefinition) => {
      setEditingWorkout({ messageId, workout });
    },
    [],
  );

  const keyboardOpen = keyboardHeight > 0;

  return (
    <View
      style={[
        styles.container,
        keyboardOpen && { paddingBottom: keyboardHeight },
      ]}
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
          {messages.length > 1 && (
            <TouchableOpacity
              onPress={clearConversation}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.newChatBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={Colors.accent} />
              <Text style={styles.newChatText}>New</Text>
            </TouchableOpacity>
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
            onEditWorkout={(workout) => handleEditWorkout(item.id, workout)}
            saving={saving}
          />
        )}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListFooterComponent={
          generating ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.typingText}>Building your workout…</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loadingConversation ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator color={Colors.textMuted} size="small" />
              <Text style={styles.typingText}>Loading conversation…</Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: keyboardOpen ? Spacing.sm : insets.bottom + Spacing.sm }]}>
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

      {/* Edit workout modal */}
      {editingWorkout && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <View
            style={[
              styles.editModal,
              { paddingTop: insets.top },
            ]}
          >
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Workout</Text>
              <TouchableOpacity
                onPress={() => setEditingWorkout(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <WorkoutEditorForm
              initial={editingWorkout.workout}
              onSave={(updated) => {
                handleEditSave(editingWorkout.messageId, updated);
                setEditingWorkout(null);
              }}
              onCancel={() => setEditingWorkout(null)}
            />
          </View>
        </Modal>
      )}
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    backgroundColor: Colors.accent + '15',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  newChatText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
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
  editModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  editModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});
