/**
 * Home screen — categorized workout list with collapsible sections.
 * Categories: Easy/Recovery, Tempo, Intervals, Long Runs, Race/Time Trial.
 * Users can long-press and drag to reorder workouts within a category.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  WorkoutDefinition,
  categorizeWorkout,
  WorkoutCategory,
} from '../../src/workout/workoutTypes';
import { loadWorkouts, deleteWorkout, saveWorkouts } from '../../src/workout/workoutStorage';
import { createPresets, getMissingDistancePresets } from '../../src/workout/presets';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { hapticTap } from '../../src/audio/haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { onSyncStatusChange } from '../../src/sync/cloudSync';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategoryConfig {
  key: WorkoutCategory;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  description: string;
  color: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAG_EDGE = 88;

function stackOffset(id: string, order: readonly string[], heights: Record<string, number>): number {
  'worklet';
  let y = 0;
  for (let i = 0; i < order.length; i++) {
    if (order[i] === id) return y;
    y += heights[order[i]] ?? 0;
  }
  return y;
}

function buildTops(
  resting: readonly string[],
  display: readonly string[],
  heights: Record<string, number>,
  activeId: string | null,
  dragOffset: number,
): Record<string, number> {
  const tops: Record<string, number> = {};
  for (let i = 0; i < resting.length; i++) {
    const id = resting[i];
    tops[id] = id === activeId
      ? stackOffset(id, resting, heights) + dragOffset
      : stackOffset(id, activeId ? display : resting, heights);
  }
  return tops;
}

function moveId(order: readonly string[], id: string, to: number): string[] {
  const from = order.indexOf(id);
  if (from < 0 || from === to) return order.slice();
  const next = order.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function slotFromTranslation(from: number, translation: number, heights: readonly number[]): number {
  let slot = from;
  let consumed = 0;
  if (translation > 0) {
    while (slot < heights.length - 1) {
      const step = heights[slot + 1] || 1;
      if (translation - consumed > step * 0.5) {
        consumed += step;
        slot += 1;
      } else {
        break;
      }
    }
  } else {
    while (slot > 0) {
      const step = heights[slot - 1] || 1;
      if (consumed - translation > step * 0.5) {
        consumed += step;
        slot -= 1;
      } else {
        break;
      }
    }
  }
  return slot;
}

function CategoryWorkoutList({
  items,
  scrollRef,
  scrollY,
  onReorder,
  onStart,
  onEdit,
  onDelete,
}: {
  items: WorkoutDefinition[];
  scrollRef: React.RefObject<ScrollView | null>;
  scrollY: React.MutableRefObject<number>;
  onReorder: (ordered: WorkoutDefinition[]) => void;
  onStart: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [data, setData] = useState(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [positioned, setPositioned] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const dataRef = useRef(items);
  const dragging = useRef(false);
  const heightMap = useRef<Record<string, number>>({});
  const scrollDir = useRef(0);
  const scrollBoost = useRef(0);
  const fingerY = useRef(0);
  const suppressEdit = useRef(false);
  const activeDragId = useRef<string | null>(null);
  const layoutLocked = useRef(false);
  const restingOrder = useSharedValue<string[]>(items.map((item) => item.id));
  const displayOrder = useSharedValue<string[]>(items.map((item) => item.id));
  const [baseline, setBaseline] = useState<Record<string, number>>({});
  const tops = useSharedValue<Record<string, number>>({});
  const baselineSV = useSharedValue<Record<string, number>>({});
  const activeIdSV = useSharedValue<string | null>(null);
  const positionedSV = useSharedValue(false);

  useEffect(() => {
    if (dragging.current) return;
    dataRef.current = items;
    setData(items);
  }, [items]);

  useLayoutEffect(() => {
    if (!positioned) {
      positionedSV.value = false;
      return;
    }
    // Apply the locked offsets and the absolute-position flag together, after
    // React has committed `top`, so the first painted frame is already correct.
    baselineSV.value = baseline;
    if (!dragging.current && activeIdSV.value == null) {
      tops.value = baseline;
      const ids = dataRef.current.map((workout) => workout.id);
      restingOrder.value = ids;
      displayOrder.value = ids;
    }
    positionedSV.value = true;
  }, [activeIdSV, baseline, baselineSV, displayOrder, positioned, positionedSV, restingOrder, tops]);

  const syncIdleLayout = useCallback((ids: string[]) => {
    const nextTops = buildTops(ids, ids, heightMap.current, null, 0);
    const total = ids.reduce((sum, id) => sum + (heightMap.current[id] ?? 0), 0);
    restingOrder.value = ids;
    displayOrder.value = ids;
    setListHeight(total);
    if (layoutLocked.current) {
      tops.value = nextTops;
      return;
    }
    layoutLocked.current = true;
    setBaseline(nextTops);
    setPositioned(true);
  }, [displayOrder, restingOrder, tops]);

  const applyShift = useCallback((effective: number) => {
    const id = activeDragId.current;
    const resting = restingOrder.value;
    if (!id || resting.length === 0) return;
    const from = resting.indexOf(id);
    if (from < 0) return;
    const orderedHeights = resting.map((itemId) => heightMap.current[itemId] ?? 0);
    const to = slotFromTranslation(from, effective, orderedHeights);
    const display = moveId(resting, id, to);
    displayOrder.value = display;
    tops.value = buildTops(resting, display, heightMap.current, id, effective);
  }, [displayOrder, restingOrder, tops]);

  useEffect(() => {
    if (!activeId) return;
    const timer = setInterval(() => {
      if (scrollDir.current === 0) return;
      const next = Math.max(0, scrollY.current + scrollDir.current);
      const moved = next - scrollY.current;
      if (moved === 0) return;
      scrollRef.current?.scrollTo({ y: next, animated: false });
      scrollY.current = next;
      scrollBoost.current += moved;
      applyShift(fingerY.current + scrollBoost.current);
    }, 16);
    return () => clearInterval(timer);
  }, [activeId, applyShift, scrollRef, scrollY]);

  const beginDrag = useCallback((id: string) => {
    if (dragging.current) return;
    const order = dataRef.current.map((workout) => workout.id);
    if (!order.includes(id)) return;
    dragging.current = true;
    suppressEdit.current = true;
    scrollBoost.current = 0;
    scrollDir.current = 0;
    fingerY.current = 0;
    restingOrder.value = order;
    displayOrder.value = order;
    activeDragId.current = id;
    activeIdSV.value = id;
    applyShift(0);
    setActiveId(id);
    hapticTap();
  }, [applyShift]);

  const updateDrag = useCallback((translationY: number, absoluteY: number) => {
    if (!dragging.current) return;
    fingerY.current = translationY;
    if (absoluteY > SCREEN_HEIGHT - DRAG_EDGE) scrollDir.current = 18;
    else if (absoluteY < DRAG_EDGE) scrollDir.current = -18;
    else scrollDir.current = 0;
    applyShift(translationY + scrollBoost.current);
  }, [applyShift]);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    const finalOrder = displayOrder.value.slice();
    const currentIds = dataRef.current.map((workout) => workout.id);
    dragging.current = false;
    scrollDir.current = 0;
    scrollBoost.current = 0;
    activeDragId.current = null;
    activeIdSV.value = null;
    restingOrder.value = finalOrder;
    displayOrder.value = finalOrder;
    tops.value = buildTops(finalOrder, finalOrder, heightMap.current, null, 0);
    setActiveId(null);
    if (finalOrder.some((id, index) => id !== currentIds[index])) {
      const byId = new Map(dataRef.current.map((workout) => [workout.id, workout]));
      const next = finalOrder
        .map((id) => byId.get(id))
        .filter((workout): workout is WorkoutDefinition => !!workout);
      dataRef.current = next;
      setData(next);
      onReorder(next);
    }
    setTimeout(() => {
      suppressEdit.current = false;
    }, 350);
  }, [activeIdSV, displayOrder, onReorder, restingOrder, tops]);

  return (
    <View style={positioned ? [styles.dragList, { height: listHeight }] : undefined}>
      {data.map((item) => (
        <DragRow
          key={item.id}
          id={item.id}
          active={item.id === activeId}
          positioned={positioned}
          topOffset={baseline[item.id] ?? 0}
          tops={tops}
          baselineSV={baselineSV}
          activeIdSV={activeIdSV}
          positionedSV={positionedSV}
          onHeight={(height) => {
            if (Math.abs((heightMap.current[item.id] ?? 0) - height) < 1) return;
            heightMap.current[item.id] = height;
            const ids = dataRef.current.map((workout) => workout.id);
            if (dragging.current || !ids.every((id) => (heightMap.current[id] ?? 0) > 0)) return;
            syncIdleLayout(ids);
          }}
          onDragStart={() => beginDrag(item.id)}
          onDragMove={updateDrag}
          onDragEnd={endDrag}
        >
          <WorkoutCard
            workout={item}
            onStart={() => onStart(item.id)}
            onEdit={() => {
              if (suppressEdit.current) return;
              onEdit(item.id);
            }}
            onDelete={() => onDelete(item.id)}
            drag={() => {}}
            isActive={item.id === activeId}
          />
        </DragRow>
      ))}
    </View>
  );
}

function DragRow({
  id,
  active,
  positioned,
  topOffset,
  tops,
  baselineSV,
  activeIdSV,
  positionedSV,
  onHeight,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
}: {
  id: string;
  active: boolean;
  positioned: boolean;
  topOffset: number;
  tops: SharedValue<Record<string, number>>;
  baselineSV: SharedValue<Record<string, number>>;
  activeIdSV: SharedValue<string | null>;
  positionedSV: SharedValue<boolean>;
  onHeight: (height: number) => void;
  onDragStart: () => void;
  onDragMove: (translationY: number, absoluteY: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}) {
  const startRef = useRef(onDragStart);
  const moveRef = useRef(onDragMove);
  const endRef = useRef(onDragEnd);
  startRef.current = onDragStart;
  moveRef.current = onDragMove;
  endRef.current = onDragEnd;

  const start = useCallback(() => {
    startRef.current();
  }, []);
  const move = useCallback((translationY: number, absoluteY: number) => {
    moveRef.current(translationY, absoluteY);
  }, []);
  const end = useCallback(() => {
    endRef.current();
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Pan()
          .activateAfterLongPress(220)
          .onStart(() => {
            runOnJS(start)();
          })
          .onUpdate((event) => {
            runOnJS(move)(event.translationY, event.absoluteY);
          })
          .onFinalize(() => {
            runOnJS(end)();
          }),
        Gesture.Native()
      ),
    [end, move, start]
  );

  const y = useSharedValue(0);

  useAnimatedReaction(
    () => tops.value[id] ?? 0,
    (next, prev) => {
      if (prev == null || activeIdSV.value == null || activeIdSV.value === id) {
        y.value = next;
      } else {
        y.value = withTiming(next, { duration: 180 });
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIdSV.value;
    const base = baselineSV.value[id] ?? 0;
    const target = tops.value[id] ?? base;
    const visual = !positionedSV.value ? base : !active || active === id ? target : y.value;
    return {
      zIndex: active === id ? 30 : 0,
      elevation: active === id ? 12 : 0,
      transform: [
        { translateY: visual - base },
        { scale: active === id ? 1.02 : 1 },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        collapsable={false}
        style={[
          positioned && styles.absoluteRow,
          positioned && { top: topOffset },
          animatedStyle,
          active && styles.dragLift,
        ]}
        onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'easy',
    title: 'Easy / Recovery',
    icon: 'leaf-outline',
    description: 'Easy-effort and recovery runs',
    color: Colors.easy,
  },
  {
    key: 'tempo',
    title: 'Tempo',
    icon: 'speedometer-outline',
    description: 'Sustained hard-effort runs',
    color: Colors.warning,
  },
  {
    key: 'intervals',
    title: 'Intervals',
    icon: 'repeat',
    description: 'Structured speed & interval sessions',
    color: Colors.danger,
  },
  {
    key: 'long_run',
    title: 'Long Runs',
    icon: 'trail-sign-outline',
    description: 'Endurance-building long runs',
    color: Colors.accent,
  },
  {
    key: 'race',
    title: 'Race / Time Trial',
    icon: 'trophy-outline',
    description: 'Race simulations and time trials',
    color: Colors.primary,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<WorkoutCategory>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);

  const reload = useCallback(async () => {
    let data = await loadWorkouts();
    if (data.length === 0) {
      data = createPresets();
      await saveWorkouts(data);
    } else {
      const missing = getMissingDistancePresets(data);
      if (missing.length > 0) {
        data = [...missing, ...data];
        await saveWorkouts(data);
      }
    }
    setWorkouts(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [user?.id, reload])
  );

  useEffect(() => {
    return onSyncStatusChange((status) => {
      if (status === 'success') reload();
    });
  }, [reload]);

  const handleDelete = async (id: string) => {
    await deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleCategory = (cat: WorkoutCategory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Group workouts by category, preserving saved order
  const grouped = workouts.reduce<Record<WorkoutCategory, WorkoutDefinition[]>>(
    (acc, w) => {
      const cat = categorizeWorkout(w);
      acc[cat].push(w);
      return acc;
    },
    { easy: [], tempo: [], intervals: [], long_run: [], race: [] }
  );

  /** Persist reordered workouts within one category back into the flat list. */
  const handleReorder = async (category: WorkoutCategory, reordered: WorkoutDefinition[]) => {
    const reorderedIds = new Set(reordered.map((w) => w.id));
    const result: WorkoutDefinition[] = [];
    let inserted = false;

    for (const w of workouts) {
      if (categorizeWorkout(w) === category && reorderedIds.has(w.id)) {
        if (!inserted) {
          result.push(...reordered);
          inserted = true;
        }
      } else {
        result.push(w);
      }
    }

    setWorkouts(result);
    await saveWorkouts(result);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
        }}
      >
        {/* Compact hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.heroLogo}
          />
          <View>
            <Text style={styles.heroTitle}>SplitCue</Text>
            <Text style={styles.heroSub}>Interval running, your way.</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push('/workout/new')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={Colors.black} />
            <Text style={styles.newBtnText}>Create Custom Workout</Text>
          </TouchableOpacity>
        </View>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const items = grouped[cat.key];
          const isExpanded = expanded.has(cat.key);
          return (
            <View key={cat.key} style={styles.categorySection}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(cat.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <Text style={styles.categoryDesc}>{cat.description}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <View style={[styles.countBadge, { backgroundColor: cat.color + '22' }]}>
                    <Text style={[styles.countText, { color: cat.color }]}>{items.length}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.categoryBody}>
                  {items.length === 0 ? (
                    <Text style={styles.emptyCategory}>
                      No workouts in this category yet
                    </Text>
                  ) : (
                    <CategoryWorkoutList
                      items={items}
                      scrollRef={scrollRef}
                      scrollY={scrollY}
                      onReorder={(ordered) => handleReorder(cat.key, ordered)}
                      onStart={(id) => router.push(`/workout/run/${id}`)}
                      onEdit={(id) => router.push(`/workout/${id}`)}
                      onDelete={handleDelete}
                    />
                  )}
                </View>
              )}
            </View>
          );
        })}

        {workouts.length === 0 && (
          <Text style={styles.emptyText}>
            No workouts yet. Create one to get started!
          </Text>
        )}
      </ScrollView>
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
  },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  heroLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1,
  },
  heroSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  newBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  newBtnText: {
    color: Colors.black,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },

  // ── Category sections ──
  categorySection: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    overflow: 'visible',
  },
  dragList: {
    position: 'relative',
  },
  absoluteRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  dragLift: {
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  categoryDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  countText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  categoryBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  emptyCategory: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
