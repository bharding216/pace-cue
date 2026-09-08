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
import Ionicons from '@expo/vector-icons/Ionicons';
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

  // ── Generic block helpers (reused for warmup, main, cooldown) ──────

  type BlockSetter = React.Dispatch<React.SetStateAction<WorkoutRepeatBlock[]>>;

  const updateBlockRepeat = (setter: BlockSetter, blockIdx: number, count: number) => {
    setter((prev) => {
      const next = [...prev];
      next[blockIdx] = { ...next[blockIdx], repeatCount: Math.max(1, count) };
      return next;
    });
  };

  const updateInterval = (
    setter: BlockSetter,
    blockIdx: number,
    intIdx: number,
    partial: Partial<WorkoutInterval>,
  ) => {
    setter((prev) => {
      const next = [...prev];
      const intervals = [...next[blockIdx].intervals];
      intervals[intIdx] = { ...intervals[intIdx], ...partial };
      next[blockIdx] = { ...next[blockIdx], intervals };
      return next;
    });
  };

  const addIntervalToBlock = (
    setter: BlockSetter,
    blockIdx: number,
    defaultType: IntervalType,
  ) => {
    setter((prev) => {
      const next = [...prev];
      const lastType =
        next[blockIdx].intervals[next[blockIdx].intervals.length - 1]?.type;
      const newType: IntervalType =
        lastType === 'hard' ? 'easy' : lastType === 'easy' ? 'hard' : defaultType;
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

  const removeInterval = (setter: BlockSetter, blockIdx: number, intIdx: number) => {
    setter((prev) => {
      const next = [...prev];
      const intervals = next[blockIdx].intervals.filter(
        (_, i) => i !== intIdx,
      );
      if (intervals.length === 0) {
        return next.filter((_, i) => i !== blockIdx);
      }
      next[blockIdx] = { ...next[blockIdx], intervals };
      return next;
    });
  };

  const swapIntervals = (setter: BlockSetter, blockIdx: number, a: number, b: number) => {
    setter((prev) => {
      const next = [...prev];
      const intervals = [...next[blockIdx].intervals];
      [intervals[a], intervals[b]] = [intervals[b], intervals[a]];
      next[blockIdx] = { ...next[blockIdx], intervals };
      return next;
    });
  };

  const addBlock = (
    setter: BlockSetter,
    defaultIntervals: WorkoutInterval[],
    defaultRepeat: number,
  ) => {
    setter((prev) => [
      ...prev,
      { intervals: defaultIntervals, repeatCount: defaultRepeat },
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
      <BlockList
        blocks={warmup}
        setter={setWarmup}
        defaultType="warmup"
        allowedTypes={['warmup', 'easy', 'hard']}
        sectionLabel="Warm Up"
        addBlockLabel="+ Add Warm Up Block"
        addIntervalLabel="+ Add Interval"
        updateBlockRepeat={updateBlockRepeat}
        updateInterval={updateInterval}
        addIntervalToBlock={addIntervalToBlock}
        removeInterval={removeInterval}
        swapIntervals={swapIntervals}
        addBlock={addBlock}
      />

      {/* Main Blocks */}
      <Text style={styles.sectionTitle}>Intervals</Text>
      <BlockList
        blocks={blocks}
        setter={setBlocks}
        defaultType="hard"
        allowedTypes={['hard', 'easy']}
        sectionLabel="Block"
        addBlockLabel="+ Add Block"
        addIntervalLabel="+ Add Interval"
        updateBlockRepeat={updateBlockRepeat}
        updateInterval={updateInterval}
        addIntervalToBlock={addIntervalToBlock}
        removeInterval={removeInterval}
        swapIntervals={swapIntervals}
        addBlock={addBlock}
      />

      {/* Cooldown */}
      <Text style={styles.sectionTitle}>Cool Down</Text>
      <BlockList
        blocks={cooldown}
        setter={setCooldown}
        defaultType="cooldown"
        allowedTypes={['cooldown', 'easy', 'hard']}
        sectionLabel="Cool Down"
        addBlockLabel="+ Add Cool Down Block"
        addIntervalLabel="+ Add Interval"
        updateBlockRepeat={updateBlockRepeat}
        updateInterval={updateInterval}
        addIntervalToBlock={addIntervalToBlock}
        removeInterval={removeInterval}
        swapIntervals={swapIntervals}
        addBlock={addBlock}
      />

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

// ── Block list sub-component ─────────────────────────────────────────

type BlockSetter = React.Dispatch<React.SetStateAction<WorkoutRepeatBlock[]>>;

interface BlockListProps {
  blocks: WorkoutRepeatBlock[];
  setter: BlockSetter;
  defaultType: IntervalType;
  allowedTypes: IntervalType[];
  sectionLabel: string;
  addBlockLabel: string;
  addIntervalLabel: string;
  updateBlockRepeat: (setter: BlockSetter, blockIdx: number, count: number) => void;
  updateInterval: (setter: BlockSetter, blockIdx: number, intIdx: number, partial: Partial<WorkoutInterval>) => void;
  addIntervalToBlock: (setter: BlockSetter, blockIdx: number, defaultType: IntervalType) => void;
  removeInterval: (setter: BlockSetter, blockIdx: number, intIdx: number) => void;
  swapIntervals: (setter: BlockSetter, blockIdx: number, a: number, b: number) => void;
  addBlock: (setter: BlockSetter, defaultIntervals: WorkoutInterval[], defaultRepeat: number) => void;
}

function BlockList({
  blocks,
  setter,
  defaultType,
  allowedTypes,
  sectionLabel,
  addBlockLabel,
  addIntervalLabel,
  updateBlockRepeat: updateRepeat,
  updateInterval: updateInt,
  addIntervalToBlock: addInt,
  removeInterval: removeInt,
  swapIntervals: swapInt,
  addBlock: addBlk,
}: BlockListProps) {
  const cycleType = (current: IntervalType): IntervalType => {
    const idx = allowedTypes.indexOf(current);
    return allowedTypes[(idx + 1) % allowedTypes.length];
  };

  return (
    <>
      {blocks.map((block, bi) => (
        <View key={bi} style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>
              {sectionLabel} {blocks.length > 1 ? bi + 1 : ''}
            </Text>
            <View style={styles.repeatRow}>
              <Text style={styles.repeatLabel}>Repeat</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  updateRepeat(setter, bi, block.repeatCount - 1);
                }}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.repeatCount}>{block.repeatCount}×</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  updateRepeat(setter, bi, block.repeatCount + 1);
                }}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {block.intervals.map((interval, ii) => (
            <View key={ii} style={styles.intervalRow}>
              {/* Reorder arrows */}
              <View style={styles.reorderCol}>
                <TouchableOpacity
                  onPress={() => {
                    hapticTap();
                    swapInt(setter, bi, ii, ii - 1);
                  }}
                  disabled={ii === 0}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={ii === 0 ? Colors.surfaceLight : Colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    hapticTap();
                    swapInt(setter, bi, ii, ii + 1);
                  }}
                  disabled={ii === block.intervals.length - 1}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={
                      ii === block.intervals.length - 1
                        ? Colors.surfaceLight
                        : Colors.textMuted
                    }
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: intervalColor(interval.type) + '22',
                    borderColor: intervalColor(interval.type),
                  },
                ]}
                onPress={() => {
                  hapticTap();
                  updateInt(setter, bi, ii, { type: cycleType(interval.type) });
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
                  updateInt(setter, bi, ii, { durationSeconds: s })
                }
                color={intervalColor(interval.type)}
              />

              <TouchableOpacity
                onPress={() => removeInt(setter, bi, ii)}
                style={styles.removeBtn}
              >
                <Ionicons name="close-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => addInt(setter, bi, defaultType)}
          >
            <Text style={styles.addBtnText}>{addIntervalLabel}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() =>
          addBlk(
            setter,
            [{ type: defaultType, durationSeconds: defaultType === 'hard' ? 180 : 300 }],
            1,
          )
        }
      >
        <Text style={styles.addBtnText}>{addBlockLabel}</Text>
      </TouchableOpacity>
    </>
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
  blockTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
    gap: Spacing.sm,
  },
  reorderCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
