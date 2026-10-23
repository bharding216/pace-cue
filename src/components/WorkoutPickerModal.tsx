/**
 * WorkoutPickerModal — bottom sheet to pick a workout from the user's library
 * for adding to a specific calendar date.
 *
 * Features: text search, category filter chips (distance / timed / intervals),
 * and a "Create New Workout" action.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  WorkoutDefinition,
  WorkoutCategory,
  totalWorkoutSeconds,
  formatTime,
  flattenWorkout,
  categorizeWorkout,
} from '../workout/workoutTypes';
import { loadWorkouts } from '../workout/workoutStorage';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface WorkoutPickerModalProps {
  visible: boolean;
  date: string;
  onSelect: (workout: WorkoutDefinition) => void;
  onCreateNew: () => void;
  onVoiceBuilder?: () => void;
  onClose: () => void;
}

// ── Category helpers ─────────────────────────────────────────

const CATEGORIES: { key: WorkoutCategory; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }[] = [
  { key: 'distance', label: 'Distance', icon: 'navigate', color: Colors.accent },
  { key: 'timed', label: 'Timed', icon: 'timer-outline', color: Colors.primary },
  { key: 'intervals', label: 'Intervals', icon: 'repeat', color: Colors.warning },
];

function categoryColor(cat: string): string {
  return CATEGORIES.find((c) => c.key === cat)?.color ?? Colors.textSecondary;
}

function categoryIcon(cat: string): React.ComponentProps<typeof Ionicons>['name'] {
  return CATEGORIES.find((c) => c.key === cat)?.icon ?? 'barbell-outline';
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ── Component ────────────────────────────────────────────────

export function WorkoutPickerModal({
  visible,
  date,
  onSelect,
  onCreateNew,
  onVoiceBuilder,
  onClose,
}: WorkoutPickerModalProps) {
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<WorkoutCategory | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSearch('');
    setActiveCategory(null);
    loadWorkouts().then((data) => {
      setWorkouts(data);
      setLoading(false);
    });
  }, [visible]);

  const filtered = useMemo(() => {
    let list = workouts;

    if (activeCategory) {
      list = list.filter((w) => categorizeWorkout(w) === activeCategory);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => w.name.toLowerCase().includes(q));
    }

    return list;
  }, [workouts, activeCategory, search]);

  // Count per category for the chip badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of workouts) {
      const cat = categorizeWorkout(w);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [workouts]);

  const handleCategoryToggle = (cat: WorkoutCategory) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Add Workout</Text>
              <Text style={styles.headerDate}>{formatDateDisplay(date)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : (
            <>
              {/* Search bar */}
              <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search workouts…"
                    placeholderTextColor={Colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Category filter chips */}
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  const count = categoryCounts[cat.key] ?? 0;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.chip,
                        isActive && { backgroundColor: cat.color + '22', borderColor: cat.color },
                      ]}
                      onPress={() => handleCategoryToggle(cat.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={13}
                        color={isActive ? cat.color : Colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          isActive && { color: cat.color },
                        ]}
                      >
                        {cat.label}
                      </Text>
                      <Text
                        style={[
                          styles.chipCount,
                          isActive && { color: cat.color },
                        ]}
                      >
                        {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Workout list */}
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  !search && !activeCategory ? (
                    <>
                      {/* Voice workout builder */}
                      {onVoiceBuilder && (
                        <TouchableOpacity
                          style={styles.voiceBuilderRow}
                          onPress={onVoiceBuilder}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.workoutIcon, { backgroundColor: Colors.accent + '22' }]}>
                            <Ionicons name="mic" size={20} color={Colors.accent} />
                          </View>
                          <View style={styles.workoutInfo}>
                            <Text style={styles.workoutName}>Describe with Voice</Text>
                            <Text style={styles.workoutMeta}>Tell the AI coach what you want</Text>
                          </View>
                          <View style={styles.aiBadge}>
                            <Ionicons name="sparkles" size={12} color={Colors.accent} />
                            <Text style={styles.aiBadgeText}>AI</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* Create new manually */}
                      <TouchableOpacity
                        style={styles.createNewRow}
                        onPress={onCreateNew}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.workoutIcon, { backgroundColor: Colors.primary + '22' }]}>
                          <Ionicons name="add" size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.workoutInfo}>
                          <Text style={styles.workoutName}>Create New Workout</Text>
                          <Text style={styles.workoutMeta}>Build a custom workout from scratch</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>
                      {search || activeCategory
                        ? 'No workouts match your filters'
                        : 'No saved workouts yet'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const cat = categorizeWorkout(item);
                  const flat = flattenWorkout(item);
                  const totalSec = totalWorkoutSeconds(item);

                  return (
                    <TouchableOpacity
                      style={styles.workoutRow}
                      onPress={() => onSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.workoutIcon, { backgroundColor: categoryColor(cat) + '22' }]}>
                        <Ionicons name={categoryIcon(cat)} size={18} color={categoryColor(cat)} />
                      </View>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.workoutMeta}>
                          {formatTime(totalSec)} · {flat.length} interval{flat.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },

  // Search
  searchRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    padding: 0,
  },

  // Category chips
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surface,
  },
  chipLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  chipCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  voiceBuilderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent + '44',
    borderStyle: 'dashed',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent + '18',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  aiBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  createNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '44',
    borderStyle: 'dashed',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  workoutMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
