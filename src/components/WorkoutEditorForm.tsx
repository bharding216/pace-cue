/**
 * Shared workout editor form used by both "new" and "edit" screens.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  WorkoutDefinition,
  WorkoutInterval,
  WorkoutRepeatBlock,
  IntervalType,
  formatTime,
  totalWorkoutSeconds,
} from '../workout/workoutTypes';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  intervalColor,
} from '../constants/theme';
import { hapticTap } from '../audio/haptics';

interface Props {
  initial: WorkoutDefinition;
  onSave: (workout: WorkoutDefinition) => void;
  onCancel: () => void;
}

export function WorkoutEditorForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [warmup, setWarmup] = useState(initial.warmup);
  const [blocks, setBlocks] = useState(initial.blocks);
  const [cooldown, setCooldown] = useState(initial.cooldown);

  const current: WorkoutDefinition = {
    ...initial,
    name,
    warmup,
    blocks,
    cooldown,
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Give your workout a name.');
      return;
    }
    onSave(current);
  };

  const updateBlockRepeat = (blockIdx: number, count: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[blockIdx] = { ...next[blockIdx], repeatCount: Math.max(1, count) };
      return next;
    });
  };

  const updateInterval = (
    blockIdx: number,
    intIdx: number,
    partial: Partial<WorkoutInterval>
  ) => {
    setBlocks((prev) => {
      const next = [...prev];
      const intervals = [...next[blockIdx].intervals];
      intervals[intIdx] = { ...intervals[intIdx], ...partial };
      next[blockIdx] = { ...next[blockIdx], intervals };
      return next;
    });
  };

  const addIntervalToBlock = (blockIdx: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const lastType =
        next[blockIdx].intervals[next[blockIdx].intervals.length - 1]?.type;
      const newType: IntervalType =
        lastType === 'hard' ? 'easy' : 'hard';
      next[blockIdx] = {
        ...next[blockIdx],
        intervals: [
          ...next[blockIdx].intervals,
          { type: newType, durationSeconds: 120 },
        ],
      };
      return next;
    });
  };

  const removeInterval = (blockIdx: number, intIdx: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const intervals = next[blockIdx].intervals.filter(
        (_, i) => i !== intIdx
      );
      if (intervals.length === 0) {
        // Remove the whole block if empty
        return next.filter((_, i) => i !== blockIdx);
      }
      next[blockIdx] = { ...next[blockIdx], intervals };
      return next;
    });
  };

  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        intervals: [
          { type: 'hard' as IntervalType, durationSeconds: 180 },
          { type: 'easy' as IntervalType, durationSeconds: 120 },
        ],
        repeatCount: 4,
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Name */}
      <Text style={styles.label}>Workout Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. 5K Speed"
        placeholderTextColor={Colors.textMuted}
      />

      {/* Warmup */}
      <Text style={styles.sectionTitle}>Warm Up</Text>
      {warmup ? (
        <View style={styles.intervalRow}>
          <DurationPicker
            seconds={warmup.durationSeconds}
            onChange={(s) =>
              setWarmup({ ...warmup, durationSeconds: s })
            }
            color={intervalColor('warmup')}
          />
          <TouchableOpacity
            onPress={() => setWarmup(null)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            setWarmup({ type: 'warmup', durationSeconds: 300 })
          }
        >
          <Text style={styles.addBtnText}>+ Add Warm Up</Text>
        </TouchableOpacity>
      )}

      {/* Blocks */}
      {blocks.map((block, bi) => (
        <View key={bi} style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={styles.sectionTitle}>Block {bi + 1}</Text>
            <View style={styles.repeatRow}>
              <Text style={styles.repeatLabel}>Repeat</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  updateBlockRepeat(bi, block.repeatCount - 1);
                }}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.repeatCount}>{block.repeatCount}×</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  updateBlockRepeat(bi, block.repeatCount + 1);
                }}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {block.intervals.map((interval, ii) => (
            <View key={ii} style={styles.intervalRow}>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      intervalColor(interval.type) + '22',
                    borderColor: intervalColor(interval.type),
                  },
                ]}
                onPress={() => {
                  hapticTap();
                  const nextType: IntervalType =
                    interval.type === 'hard' ? 'easy' : 'hard';
                  updateInterval(bi, ii, { type: nextType });
                }}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: intervalColor(interval.type) },
                  ]}
                >
                  {interval.type.toUpperCase()}
                </Text>
              </TouchableOpacity>

              <DurationPicker
                seconds={interval.durationSeconds}
                onChange={(s) =>
                  updateInterval(bi, ii, { durationSeconds: s })
                }
                color={intervalColor(interval.type)}
              />

              <TouchableOpacity
                onPress={() => removeInterval(bi, ii)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => addIntervalToBlock(bi)}
          >
            <Text style={styles.addBtnText}>+ Add Interval</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={addBlock}>
        <Text style={styles.addBtnText}>+ Add Block</Text>
      </TouchableOpacity>

      {/* Cooldown */}
      <Text style={styles.sectionTitle}>Cool Down</Text>
      {cooldown ? (
        <View style={styles.intervalRow}>
          <DurationPicker
            seconds={cooldown.durationSeconds}
            onChange={(s) =>
              setCooldown({ ...cooldown, durationSeconds: s })
            }
            color={intervalColor('cooldown')}
          />
          <TouchableOpacity
            onPress={() => setCooldown(null)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            setCooldown({ type: 'cooldown', durationSeconds: 300 })
          }
        >
          <Text style={styles.addBtnText}>+ Add Cool Down</Text>
        </TouchableOpacity>
      )}

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Duration</Text>
        <Text style={styles.totalValue}>
          {formatTime(totalWorkoutSeconds(current))}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>Save Workout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Duration picker sub-component ────────────────────────────────────

function DurationPicker({
  seconds,
  onChange,
  color,
}: {
  seconds: number;
  onChange: (s: number) => void;
  color: string;
}) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const step = (delta: number) => {
    hapticTap();
    onChange(Math.max(5, seconds + delta));
  };

  return (
    <View style={dpStyles.container}>
      <TouchableOpacity onPress={() => step(-15)} style={dpStyles.btn}>
        <Text style={dpStyles.btnText}>−</Text>
      </TouchableOpacity>
      <Text style={[dpStyles.value, { color }]}>
        {mins}:{secs.toString().padStart(2, '0')}
      </Text>
      <TouchableOpacity onPress={() => step(15)} style={dpStyles.btn}>
        <Text style={dpStyles.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const dpStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  block: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  repeatLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  repeatCount: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
    minWidth: 36,
    textAlign: 'center',
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  typeChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  typeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  removeBtn: {
    padding: Spacing.sm,
  },
  removeBtnText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  addBtn: {
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addBtnText: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  totalLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: FontSize.xl,
    color: Colors.primary,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.black,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
