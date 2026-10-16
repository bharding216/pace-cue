/**
 * Shared workout editor form used by both "new" and "edit" screens.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  WorkoutCategory,
  IntervalType,
  formatTime,
  totalWorkoutSeconds,
  totalWorkoutDistanceMeters,
  INTERVAL_LABEL_OPTIONS,
  isDistanceInterval,
  formatDistanceShort,
  METERS_PER_MILE,
  METERS_PER_KM,
  RACE_DISTANCES,
  hasDistanceFeature,
  categorizeWorkout,
} from '../workout/workoutTypes';
import { loadSettings } from '../workout/workoutStorage';
import type { PaceUnit } from '../pace/paceTypes';
import { formatPaceDisplay } from '../pace/paceTracker';
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
  onSaveAsNew?: (workout: WorkoutDefinition) => void;
  onCancel: () => void;
  /** When true, auto-saves on every change (for editing existing workouts). */
  autoSave?: boolean;
}

export function WorkoutEditorForm({ initial, onSave, onSaveAsNew, onCancel, autoSave }: Props) {
  const [name, setName] = useState(initial.name);
  const [warmup, setWarmup] = useState(initial.warmup);
  const [blocks, setBlocks] = useState(initial.blocks);
  const [cooldown, setCooldown] = useState(initial.cooldown);
  const [targetDistance, setTargetDistance] = useState(initial.targetDistanceMeters ?? 0);
  const [category, setCategory] = useState<WorkoutCategory | undefined>(initial.category);
  const [paceUnit, setPaceUnit] = useState<PaceUnit>('minPerMile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Load user's pace unit preference
  useEffect(() => {
    loadSettings().then(s => setPaceUnit(s.paceUnit));
  }, []);

  const current: WorkoutDefinition = {
    ...initial,
    name,
    warmup,
    blocks,
    cooldown,
    targetDistanceMeters: targetDistance > 0 ? targetDistance : undefined,
    category,
  };

  // Auto-save with debounce when editing existing workouts
  useEffect(() => {
    if (!autoSave) return;

    // Skip auto-save on initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!name.trim()) return;
      onSave({
        ...initial,
        name,
        warmup,
        blocks,
        cooldown,
        targetDistanceMeters: targetDistance > 0 ? targetDistance : undefined,
        category,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, warmup, blocks, cooldown, targetDistance, category, autoSave]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Give your workout a name.');
      return;
    }
    onSave(current);
  };

  const handleSaveAsNew = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Give your workout a name.');
      return;
    }
    onSaveAsNew?.(current);
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
    <View style={styles.container}>
      {/* Sticky auto-save header (edit mode only) */}
      {autoSave && (
        <View style={styles.autoSaveHeader}>
          <View style={styles.autoSaveStatus}>
            {saveStatus === 'saved' ? (
              <>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.autoSaveText}>Saved</Text>
              </>
            ) : (
              <Text style={styles.autoSaveTextIdle}>Auto-saves as you edit</Text>
            )}
          </View>
          {onSaveAsNew && (
            <TouchableOpacity
              style={styles.saveAsNewHeaderBtn}
              onPress={handleSaveAsNew}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={14} color={Colors.accent} />
              <Text style={styles.saveAsNewHeaderText}>Save as New</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
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

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <CategoryPicker value={category ?? categorizeWorkout(current)} onChange={setCategory} />

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
        paceUnit={paceUnit}
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
        paceUnit={paceUnit}
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
        paceUnit={paceUnit}
        updateBlockRepeat={updateBlockRepeat}
        updateInterval={updateInterval}
        addIntervalToBlock={addIntervalToBlock}
        removeInterval={removeInterval}
        swapIntervals={swapIntervals}
        addBlock={addBlock}
      />

      {/* Target Distance */}
      <Text style={styles.sectionTitle}>Target Distance</Text>
      <Text style={styles.targetDistHint}>
        Optional — workout auto-finishes when this GPS distance is reached
      </Text>
      <TargetDistancePicker
        meters={targetDistance}
        onChange={setTargetDistance}
        paceUnit={paceUnit}
      />

      {/* Total — show distance for distance workouts, time for timed/intervals */}
      {(category ?? categorizeWorkout(current)) === 'distance' ? (
        totalWorkoutDistanceMeters(current) != null && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Target Distance</Text>
            <Text style={[styles.totalValue, { color: Colors.accent }]}>
              {formatDistanceShort(totalWorkoutDistanceMeters(current)!, paceUnit)}
            </Text>
          </View>
        )
      ) : (
        <>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Duration</Text>
            <Text style={styles.totalValue}>
              {formatTime(totalWorkoutSeconds(current))}
            </Text>
          </View>
          {totalWorkoutDistanceMeters(current) != null && (
            <View style={[styles.totalRow, { marginTop: Spacing.sm }]}>
              <Text style={styles.totalLabel}>Target Distance</Text>
              <Text style={[styles.totalValue, { color: Colors.accent }]}>
                {formatDistanceShort(totalWorkoutDistanceMeters(current)!, paceUnit)}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Actions — only shown for new workout creation */}
      {!autoSave && (
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
      )}
    </ScrollView>
    </View>
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
  paceUnit: PaceUnit;
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
  paceUnit,
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

                  {isDistanceInterval(interval) ? (
                    <DistancePicker
                      meters={interval.distanceMeters || 1609}
                      onChange={(m) =>
                        updateInt(setter, bi, ii, { distanceMeters: m, durationSeconds: 0 })
                      }
                      color={intervalColor(interval.type)}
                      paceUnit={paceUnit}
                    />
                  ) : (
                    <DurationPicker
                      seconds={interval.durationSeconds}
                      onChange={(s) =>
                        updateInt(setter, bi, ii, { durationSeconds: s })
                      }
                      color={intervalColor(interval.type)}
                    />
                  )}

                  <TouchableOpacity
                    onPress={() => removeInt(setter, bi, ii)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close-outline" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* ── Measure: Time vs Distance (mutually exclusive) ── */}
                <View style={styles.toggleGroupBox}>
                  <Text style={styles.toggleGroupLabel}>MEASURE</Text>
                  <View style={styles.segmentedControl}>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        !isDistanceInterval(interval) && styles.segmentBtnActive,
                      ]}
                      onPress={() => {
                        hapticTap();
                        updateInt(setter, bi, ii, {
                          durationSeconds: interval.durationSeconds || 120,
                          distanceMeters: undefined,
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={!isDistanceInterval(interval) ? Colors.primary : Colors.textMuted}
                      />
                      <Text style={[
                        styles.segmentBtnText,
                        !isDistanceInterval(interval) && styles.segmentBtnTextActive,
                      ]}>Time</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        isDistanceInterval(interval) && styles.segmentBtnActiveAlt,
                      ]}
                      onPress={() => {
                        hapticTap();
                        updateInt(setter, bi, ii, {
                          durationSeconds: 0,
                          distanceMeters: interval.distanceMeters || 1609,
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={14}
                        color={isDistanceInterval(interval) ? Colors.accent : Colors.textMuted}
                      />
                      <Text style={[
                        styles.segmentBtnText,
                        isDistanceInterval(interval) && styles.segmentBtnTextActiveAlt,
                      ]}>Distance</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Intensity: Effort vs Pace (mutually exclusive) ── */}
                <IntensityPicker
                  effort={interval.effort}
                  targetPace={interval.targetPace}
                  onChangeEffort={(e) => updateInt(setter, bi, ii, { effort: e })}
                  onChangePace={(p) => updateInt(setter, bi, ii, { targetPace: p })}
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

// ── Intensity picker (effort OR pace — mutually exclusive) ────────────

const EFFORT_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function effortColor(effort: number): string {
  if (effort <= 3) return Colors.accent;
  if (effort <= 6) return '#F59E0B';
  if (effort <= 8) return '#F97316';
  return Colors.danger;
}

function IntensityPicker({
  effort,
  targetPace,
  onChangeEffort,
  onChangePace,
}: {
  effort?: number;
  targetPace?: number;
  onChangeEffort: (e: number | undefined) => void;
  onChangePace: (p: number | undefined) => void;
}) {
  const [mode, setMode] = useState<'effort' | 'pace' | null>(
    effort != null ? 'effort' : targetPace != null ? 'pace' : null,
  );
  const [editingPace, setEditingPace] = useState(false);
  const [editMins, setEditMins] = useState('');
  const [editSecs, setEditSecs] = useState('');

  const toggleMode = (m: 'effort' | 'pace') => {
    hapticTap();
    if (mode === m) {
      // Deselect current mode
      setMode(null);
      if (m === 'effort') onChangeEffort(undefined);
      else {
        onChangePace(undefined);
        setEditingPace(false);
      }
    } else {
      // Switch to new mode — clear the other
      setMode(m);
      if (m === 'effort') {
        onChangePace(undefined);
        setEditingPace(false);
      } else {
        onChangeEffort(undefined);
        if (targetPace != null) {
          const mins = Math.floor(targetPace);
          const secs = Math.round((targetPace - mins) * 60);
          setEditMins(mins.toString());
          setEditSecs(secs.toString().padStart(2, '0'));
        } else {
          setEditMins('8');
          setEditSecs('00');
        }
        setEditingPace(true);
      }
    }
  };

  const confirmPace = () => {
    const m = parseInt(editMins, 10) || 0;
    const s = parseInt(editSecs, 10) || 0;
    if (m === 0 && s === 0) {
      onChangePace(undefined);
      setMode(null);
      setEditingPace(false);
      return;
    }
    onChangePace(m + Math.min(59, s) / 60);
    setEditingPace(false);
  };

  const startEditPace = () => {
    if (targetPace != null) {
      const mins = Math.floor(targetPace);
      const secs = Math.round((targetPace - mins) * 60);
      setEditMins(mins.toString());
      setEditSecs(secs.toString().padStart(2, '0'));
    }
    setEditingPace(true);
  };

  return (
    <View style={ipStyles.container}>
      {/* Mode toggle */}
      <View style={styles.toggleGroupBox}>
        <Text style={styles.toggleGroupLabel}>INTENSITY</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              mode === 'effort' && {
                backgroundColor: Colors.warning + '18',
                borderColor: Colors.warning + '44',
              },
            ]}
            onPress={() => toggleMode('effort')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="flame-outline"
              size={14}
              color={mode === 'effort' ? Colors.warning : Colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                mode === 'effort' && { color: Colors.warning },
              ]}
            >
              Effort
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              mode === 'pace' && {
                backgroundColor: Colors.accent + '18',
                borderColor: Colors.accent + '44',
              },
            ]}
            onPress={() => toggleMode('pace')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="speedometer-outline"
              size={14}
              color={mode === 'pace' ? Colors.accent : Colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                mode === 'pace' && { color: Colors.accent },
              ]}
            >
              Pace
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Effort chips */}
      {mode === 'effort' && (
        <View style={ipStyles.pickerContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ipStyles.effortChips}
          >
            {EFFORT_VALUES.map((val) => {
              const isActive = effort === val;
              const color = effortColor(val);
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    ipStyles.effortChip,
                    isActive && {
                      borderColor: color,
                      backgroundColor: color + '22',
                    },
                  ]}
                  onPress={() => {
                    hapticTap();
                    onChangeEffort(isActive ? undefined : val);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      ipStyles.effortChipText,
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
            <Text
              style={[ipStyles.summary, { color: effortColor(effort) }]}
            >
              {effort}/10 effort
            </Text>
          )}
        </View>
      )}

      {/* Pace input */}
      {mode === 'pace' && (
        <View style={ipStyles.pickerContent}>
          {editingPace ? (
            <View style={ipStyles.paceEditRow}>
              <TextInput
                style={ipStyles.paceInput}
                value={editMins}
                onChangeText={setEditMins}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                autoFocus
                placeholder="M"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={ipStyles.paceColon}>:</Text>
              <TextInput
                style={ipStyles.paceInput}
                value={editSecs}
                onChangeText={setEditSecs}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                placeholder="SS"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={ipStyles.paceUnit}>/mi</Text>
              <TouchableOpacity
                onPress={confirmPace}
                style={ipStyles.paceDoneBtn}
              >
                <Ionicons name="checkmark" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : targetPace != null ? (
            <View style={ipStyles.paceDisplayRow}>
              <Ionicons
                name="speedometer-outline"
                size={14}
                color={Colors.accent}
              />
              <TouchableOpacity
                onPress={startEditPace}
                activeOpacity={0.7}
              >
                <Text style={ipStyles.paceValue}>
                  {formatPaceDisplay(targetPace)}/mi
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const ipStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  pickerContent: {
    marginTop: Spacing.xs,
  },
  effortChips: {
    flexDirection: 'row',
    gap: 4,
  },
  effortChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surfaceLight,
  },
  effortChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  summary: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  paceEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paceInput: {
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
  paceColon: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  paceUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  paceDoneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  paceDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paceValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
});

// ── Category picker ──────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: WorkoutCategory; label: string; icon: string }[] = [
  { value: 'distance', label: 'Distance', icon: 'navigate-outline' },
  { value: 'timed', label: 'Timed', icon: 'time-outline' },
  { value: 'intervals', label: 'Intervals', icon: 'repeat-outline' },
];

function CategoryPicker({
  value,
  onChange,
}: {
  value: WorkoutCategory;
  onChange: (c: WorkoutCategory) => void;
}) {
  return (
    <View style={catStyles.row}>
      {CATEGORY_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[catStyles.chip, isActive && catStyles.chipActive]}
            onPress={() => {
              hapticTap();
              onChange(opt.value);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={opt.icon as any}
              size={16}
              color={isActive ? Colors.primary : Colors.textMuted}
            />
            <Text style={[catStyles.chipText, isActive && catStyles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const catStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surfaceLight,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.primary,
  },
});

// ── Target distance picker ───────────────────────────────────────────

const DISTANCE_PRESETS: { label: string; meters: number }[] = [
  { label: '5K', meters: 5000 },
  { label: '10K', meters: 10000 },
  { label: 'Half', meters: 21097 },
  { label: 'Marathon', meters: 42195 },
];

function TargetDistancePicker({
  meters,
  onChange,
  paceUnit,
}: {
  meters: number;
  onChange: (m: number) => void;
  paceUnit: PaceUnit;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const divisor = paceUnit === 'minPerMile' ? METERS_PER_MILE : METERS_PER_KM;
  const unitLabel = paceUnit === 'minPerMile' ? 'mi' : 'km';

  const startEdit = () => {
    setEditValue(meters > 0 ? (meters / divisor).toFixed(1) : '');
    setEditing(true);
  };

  const confirmEdit = () => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) {
      onChange(0);
    } else {
      onChange(Math.round(val * divisor));
    }
    setEditing(false);
  };

  const clear = () => {
    hapticTap();
    onChange(0);
  };

  return (
    <View style={tdStyles.container}>
      <View style={tdStyles.presetRow}>
        {DISTANCE_PRESETS.map(p => {
          const isActive = Math.abs(meters - p.meters) < 100;
          return (
            <TouchableOpacity
              key={p.label}
              style={[tdStyles.chip, isActive && tdStyles.chipActive]}
              onPress={() => {
                hapticTap();
                onChange(isActive ? 0 : p.meters);
              }}
              activeOpacity={0.7}
            >
              <Text style={[tdStyles.chipText, isActive && tdStyles.chipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[tdStyles.chip, meters > 0 && !DISTANCE_PRESETS.some(p => Math.abs(meters - p.meters) < 100) && tdStyles.chipActive]}
          onPress={startEdit}
          activeOpacity={0.7}
        >
          <Text style={[tdStyles.chipText, meters > 0 && !DISTANCE_PRESETS.some(p => Math.abs(meters - p.meters) < 100) && tdStyles.chipTextActive]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>
      {editing && (
        <View style={tdStyles.editRow}>
          <TextInput
            style={tdStyles.editInput}
            value={editValue}
            onChangeText={setEditValue}
            keyboardType="decimal-pad"
            maxLength={6}
            autoFocus
            placeholder="0.0"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={tdStyles.editUnit}>{unitLabel}</Text>
          <TouchableOpacity onPress={confirmEdit} style={tdStyles.doneBtn}>
            <Ionicons name="checkmark" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      {meters > 0 && !editing && (
        <View style={tdStyles.valueRow}>
          <Text style={tdStyles.valueText}>
            {formatDistanceShort(meters, paceUnit)}
          </Text>
          <TouchableOpacity onPress={clear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const tdStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surfaceLight,
  },
  chipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '22',
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.accent,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  editInput: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    width: 72,
    height: 36,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    padding: 0,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  editUnit: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  valueText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
});

// ── Interval distance picker ─────────────────────────────────────────

const INTERVAL_DISTANCE_PRESETS: { label: string; meters: number }[] = [
  { label: '400m', meters: 400 },
  { label: '800m', meters: 800 },
  { label: '1 mi', meters: 1609 },
  { label: '1 km', meters: 1000 },
  { label: '2 mi', meters: 3219 },
];

function DistancePicker({
  meters,
  onChange,
  color,
  paceUnit,
}: {
  meters: number;
  onChange: (m: number) => void;
  color: string;
  paceUnit: PaceUnit;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const divisor = paceUnit === 'minPerMile' ? METERS_PER_MILE : METERS_PER_KM;
  const unitLabel = paceUnit === 'minPerMile' ? 'mi' : 'km';

  const startEdit = () => {
    setEditValue(meters > 0 ? (meters / divisor).toFixed(2) : '');
    setEditing(true);
  };

  const confirmEdit = () => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) {
      onChange(400);
    } else {
      onChange(Math.round(val * divisor));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={dpStyles.editContainer}>
        <TextInput
          style={[dpStyles.editInput, { width: 72 }]}
          value={editValue}
          onChangeText={setEditValue}
          keyboardType="decimal-pad"
          maxLength={5}
          selectTextOnFocus
          autoFocus
          placeholder="0.0"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' }}>{unitLabel}</Text>
        <TouchableOpacity onPress={confirmEdit} style={dpStyles.doneBtn}>
          <Ionicons name="checkmark" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={startEdit}
      activeOpacity={0.7}
      style={dpStyles.tapToEdit}
    >
      <Text style={[dpStyles.value, { color }]}>
        {formatDistanceShort(meters, paceUnit)}
      </Text>
      <View style={dpStyles.editIconCircle}>
        <Ionicons name="pencil" size={14} color={Colors.textSecondary} />
      </View>
    </TouchableOpacity>
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
  const [editing, setEditing] = useState(false);
  const [editMins, setEditMins] = useState('');
  const [editSecs, setEditSecs] = useState('');

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

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
    <TouchableOpacity
      onPress={startEdit}
      activeOpacity={0.7}
      style={dpStyles.tapToEdit}
    >
      <Text style={[dpStyles.value, { color }]}>
        {mins}:{secs.toString().padStart(2, '0')}
      </Text>
      <View style={dpStyles.editIconCircle}>
        <Ionicons name="pencil" size={14} color={Colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const dpStyles = StyleSheet.create({
  tapToEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.xs + 2,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'center',
  },
  editIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  autoSaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
    backgroundColor: Colors.background,
  },
  autoSaveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  autoSaveText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  autoSaveTextIdle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  saveAsNewHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  saveAsNewHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.accent,
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
  saveAsNewBtn: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  saveAsNewBtnText: {
    color: Colors.accent,
    fontSize: FontSize.lg,
    fontWeight: '700',
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
  targetDistHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  toggleGroupBox: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  toggleGroupLabel: {
    fontSize: FontSize.xs - 1,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surfaceLight,
  },
  segmentBtnActive: {
    borderColor: Colors.primary + '55',
    backgroundColor: Colors.primary + '18',
  },
  segmentBtnActiveAlt: {
    borderColor: Colors.accent + '55',
    backgroundColor: Colors.accent + '18',
  },
  segmentBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  segmentBtnTextActive: {
    color: Colors.primary,
  },
  segmentBtnTextActiveAlt: {
    color: Colors.accent,
  },
});
