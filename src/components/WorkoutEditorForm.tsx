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
  Modal,
  Pressable,
} from 'react-native';
import {
  WorkoutDefinition,
  WorkoutInterval,
  WorkoutRepeatBlock,
  IntervalType,
  formatTime,
  totalWorkoutSeconds,
  INTERVAL_LABEL_OPTIONS,
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

/** Display text for the badge: use the custom label if set, otherwise the type name. */
function badgeLabel(interval: WorkoutInterval): string {
  return interval.label ?? defaultLabelForType(interval.type);
}

function defaultLabelForType(type: IntervalType): string {
  switch (type) {
    case 'warmup': return 'Warm Up';
    case 'cooldown': return 'Cool Down';
    case 'hard': return 'Hard';
    case 'easy': return 'Easy';
  }
}

/** Build grouped label options for the picker from allowed interval types. */
function buildLabelOptions(allowedTypes: IntervalType[]) {
  const allTypes: IntervalType[] = ['hard', 'easy', 'warmup', 'cooldown'];
  return allTypes
    .filter((t) => allowedTypes.includes(t))
    .map((type) => ({ type, labels: [...INTERVAL_LABEL_OPTIONS[type]] }));
}

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
  const [pickerTarget, setPickerTarget] = useState<{
    blockIdx: number;
    intIdx: number;
  } | null>(null);

  const pickerInterval =
    pickerTarget != null
      ? blocks[pickerTarget.blockIdx]?.intervals[pickerTarget.intIdx]
      : null;

  const allOptions = buildLabelOptions(allowedTypes);

  const handlePickLabel = (type: IntervalType, label: string) => {
    if (pickerTarget) {
      hapticTap();
      updateInt(setter, pickerTarget.blockIdx, pickerTarget.intIdx, {
        type,
        label,
      });
      setPickerTarget(null);
    }
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

              <View style={styles.intervalContent}>
                <View style={styles.intervalTopRow}>
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
                      setPickerTarget({ blockIdx: bi, intIdx: ii });
                    }}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: intervalColor(interval.type) },
                      ]}
                    >
                      {badgeLabel(interval)}
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

                <EffortPicker
                  effort={interval.effort}
                  onChange={(e) => updateInt(setter, bi, ii, { effort: e })}
                />
              </View>
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

      {/* Label picker modal */}
      <Modal
        visible={pickerTarget != null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}
      >
        <Pressable
          style={pickerStyles.backdrop}
          onPress={() => setPickerTarget(null)}
        />
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>Choose Label</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {allOptions.map((group) => (
              <View key={group.type}>
                <Text
                  style={[
                    pickerStyles.groupTitle,
                    { color: intervalColor(group.type) },
                  ]}
                >
                  {group.type.toUpperCase()}
                </Text>
                <View style={pickerStyles.optionGrid}>
                  {group.labels.map((label) => {
                    const isActive =
                      pickerInterval?.type === group.type &&
                      badgeLabel(pickerInterval) === label;
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          pickerStyles.option,
                          {
                            borderColor: isActive
                              ? intervalColor(group.type)
                              : Colors.surfaceLight,
                            backgroundColor: isActive
                              ? intervalColor(group.type) + '33'
                              : Colors.surfaceLight,
                          },
                        ]}
                        onPress={() => handlePickLabel(group.type, label)}
                      >
                        <Text
                          style={[
                            pickerStyles.optionText,
                            {
                              color: isActive
                                ? intervalColor(group.type)
                                : Colors.textSecondary,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  groupTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  option: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  optionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});

// ── Effort picker sub-component ───────────────────────────────────────

const EFFORT_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function effortColor(effort: number): string {
  if (effort <= 3) return Colors.accent;
  if (effort <= 6) return '#F59E0B';
  if (effort <= 8) return '#F97316';
  return Colors.danger;
}

function EffortPicker({
  effort,
  onChange,
}: {
  effort?: number;
  onChange: (e: number | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded && effort == null) {
    return (
      <TouchableOpacity
        style={effortStyles.addBtn}
        onPress={() => {
          hapticTap();
          setExpanded(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={effortStyles.addBtnText}>+ Effort</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={effortStyles.container}>
      <View style={effortStyles.row}>
        <Text style={effortStyles.label}>Effort</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={effortStyles.chips}
        >
          {EFFORT_VALUES.map((val) => {
            const isActive = effort === val;
            const color = effortColor(val);
            return (
              <TouchableOpacity
                key={val}
                style={[
                  effortStyles.chip,
                  isActive && { borderColor: color, backgroundColor: color + '22' },
                ]}
                onPress={() => {
                  hapticTap();
                  onChange(isActive ? undefined : val);
                  if (isActive) setExpanded(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    effortStyles.chipText,
                    isActive && { color },
                  ]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {effort != null && (
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              onChange(undefined);
              setExpanded(false);
            }}
            style={effortStyles.clearBtn}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {effort != null && (
        <Text style={[effortStyles.summary, { color: effortColor(effort) }]}>
          {effort}/10 effort
        </Text>
      )}
    </View>
  );
}

const effortStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surfaceLight,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  clearBtn: {
    marginLeft: 2,
  },
  addBtn: {
    marginTop: 4,
    paddingVertical: 4,
  },
  addBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  summary: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
});

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
  const [editing, setEditing] = useState(false);
  const [editMins, setEditMins] = useState('');
  const [editSecs, setEditSecs] = useState('');

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const step = (delta: number) => {
    hapticTap();
    onChange(Math.max(5, seconds + delta));
  };

  const startEdit = () => {
    setEditMins(mins.toString());
    setEditSecs(secs.toString().padStart(2, '0'));
    setEditing(true);
  };

  const confirmEdit = () => {
    const m = parseInt(editMins, 10) || 0;
    const s = parseInt(editSecs, 10) || 0;
    const total = Math.max(5, m * 60 + Math.min(59, s));
    onChange(total);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={dpStyles.editContainer}>
        <TextInput
          style={dpStyles.editInput}
          value={editMins}
          onChangeText={setEditMins}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          autoFocus
          placeholder="M"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={dpStyles.editColon}>:</Text>
        <TextInput
          style={dpStyles.editInput}
          value={editSecs}
          onChangeText={setEditSecs}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholder="SS"
          placeholderTextColor={Colors.textMuted}
        />
        <TouchableOpacity onPress={confirmEdit} style={dpStyles.doneBtn}>
          <Ionicons name="checkmark" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={dpStyles.container}>
      <TouchableOpacity onPress={() => step(-15)} style={dpStyles.btn}>
        <Text style={dpStyles.btnText}>−</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={startEdit} activeOpacity={0.7}>
        <Text style={[dpStyles.value, { color }]}>
          {mins}:{secs.toString().padStart(2, '0')}
        </Text>
      </TouchableOpacity>
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
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editInput: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    padding: 0,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  editColon: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
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
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  intervalContent: {
    flex: 1,
  },
  intervalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
