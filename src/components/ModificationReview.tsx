/**
 * ModificationReview — Before/after comparison of AI-proposed plan changes.
 *
 * Shows what the AI wants to change, lets the runner approve (Apply)
 * or keep the original plan. After applying, an Undo button appears
 * for a short window.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import type { PlanModification } from '../ai/planService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Types ──────────────────────────────────────────────────

export interface ModificationItem {
  modification: PlanModification;
  /** The existing day_label/description for before comparison. */
  before?: { day_label?: string; description?: string } | null;
}

interface Props {
  items: ModificationItem[];
  coachMessage?: string;
  onApply: (modifications: PlanModification[]) => Promise<void>;
  onKeepOriginal: () => void;
  onUndo?: () => Promise<void>;
}

const UNDO_WINDOW_MS = 15_000;

// ── Component ──────────────────────────────────────────────

export function ModificationReview({ items, coachMessage, onApply, onKeepOriginal, onUndo }: Props) {
  const [status, setStatus] = useState<'reviewing' | 'applying' | 'applied' | 'undoing'>('reviewing');
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handleApply = useCallback(async () => {
    setStatus('applying');
    try {
      await onApply(items.map((i) => i.modification));
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStatus('applied');
      if (onUndo) {
        setShowUndo(true);
        undoProgress.setValue(1);
        Animated.timing(undoProgress, {
          toValue: 0,
          duration: UNDO_WINDOW_MS,
          useNativeDriver: false,
        }).start();
        undoTimerRef.current = setTimeout(() => {
          setShowUndo(false);
        }, UNDO_WINDOW_MS);
      }
    } catch {
      setStatus('reviewing');
    }
  }, [items, onApply, onUndo, undoProgress]);

  const handleUndo = useCallback(async () => {
    if (!onUndo) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setStatus('undoing');
    try {
      await onUndo();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowUndo(false);
      setStatus('reviewing');
    } catch {
      setStatus('applied');
    }
  }, [onUndo]);

  if (items.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="git-compare-outline" size={20} color={Colors.accent} />
        <Text style={styles.headerTitle}>Suggested Changes</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>

      {/* Coach message */}
      {coachMessage && (
        <View style={styles.coachBubble}>
          <Text style={styles.coachText}>{coachMessage}</Text>
        </View>
      )}

      {/* Change cards */}
      {items.map((item, index) => (
        <View key={`${item.modification.date}-${index}`} style={styles.changeCard}>
          <Text style={styles.changeDate}>{formatDate(item.modification.date)}</Text>

          {item.modification.action === 'skip' ? (
            <View style={styles.skipRow}>
              <Ionicons name="close-circle" size={16} color={Colors.danger} />
              <Text style={styles.skipText}>Skip this workout</Text>
            </View>
          ) : (
            <View style={styles.comparison}>
              {/* Before */}
              {item.before && (
                <View style={styles.beforeSection}>
                  <Text style={styles.sectionLabel}>Before</Text>
                  <Text style={styles.beforeLabel}>{item.before.day_label || 'Workout'}</Text>
                  {item.before.description && (
                    <Text style={styles.beforeDesc} numberOfLines={2}>
                      {item.before.description}
                    </Text>
                  )}
                </View>
              )}

              {item.before && <Ionicons name="arrow-down" size={16} color={Colors.textMuted} style={styles.arrow} />}

              {/* After */}
              <View style={styles.afterSection}>
                <Text style={styles.sectionLabel}>After</Text>
                <Text style={styles.afterLabel}>
                  {item.modification.day_label || 'Updated Workout'}
                </Text>
                {item.modification.description && (
                  <Text style={styles.afterDesc} numberOfLines={2}>
                    {item.modification.description}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Action buttons */}
      {status === 'reviewing' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.black} />
            <Text style={styles.applyBtnText}>Apply Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepBtn} onPress={onKeepOriginal} activeOpacity={0.7}>
            <Text style={styles.keepBtnText}>Keep Original</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'applying' && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Applying changes…</Text>
        </View>
      )}

      {status === 'applied' && (
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
          <Text style={[styles.statusText, { color: Colors.primary }]}>Changes applied</Text>
        </View>
      )}

      {/* Undo bar */}
      {showUndo && onUndo && (
        <View style={styles.undoBar}>
          <Animated.View
            style={[
              styles.undoProgress,
              {
                width: undoProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} activeOpacity={0.8}>
            <Ionicons name="arrow-undo" size={16} color={Colors.white} />
            <Text style={styles.undoBtnText}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.accent + '30',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
  },
  coachBubble: {
    backgroundColor: Colors.accent + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  coachText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    lineHeight: 20,
  },
  changeCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  changeDate: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: '600',
  },
  comparison: {},
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  beforeSection: {
    opacity: 0.6,
  },
  beforeLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  beforeDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
  arrow: {
    alignSelf: 'center',
    marginVertical: 4,
  },
  afterSection: {},
  afterLabel: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  afterDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    gap: Spacing.xs,
  },
  applyBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
  },
  keepBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  keepBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  undoBar: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  undoProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: Colors.accent + '20',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: Spacing.xs,
  },
  undoBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.white,
  },
});
