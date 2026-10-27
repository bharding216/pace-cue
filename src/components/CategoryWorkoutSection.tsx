/**
 * One collapsible category on the workout library.
 * Users can sort the workouts inside it, or switch to custom order
 * and reorder with the arrows or by dragging the handle.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  NestableDraggableFlatList,
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
  WorkoutDefinition,
  WorkoutCategory,
} from '../workout/workoutTypes';
import {
  WorkoutSortMode,
  WORKOUT_SORT_OPTIONS,
} from '../workout/workoutOrder';
import { WorkoutCard } from './WorkoutCard';
import { hapticTap } from '../audio/haptics';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CategoryConfig {
  key: WorkoutCategory;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  description: string;
  color: string;
}

export const CATEGORIES: CategoryConfig[] = [
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

interface CategoryWorkoutSectionProps {
  config: CategoryConfig;
  workouts: WorkoutDefinition[];
  sortMode: WorkoutSortMode;
  expanded: boolean;
  onToggle: () => void;
  onChangeSort: (mode: WorkoutSortMode) => void;
  onReorder: (ordered: WorkoutDefinition[]) => void;
  onStart: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CategoryWorkoutSection({
  config,
  workouts,
  sortMode,
  expanded,
  onToggle,
  onChangeSort,
  onReorder,
  onStart,
  onEdit,
  onDelete,
}: CategoryWorkoutSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canSort = workouts.length > 1;
  const canReorder = sortMode === 'custom' && canSort;

  const toggleExpanded = () => {
    if (expanded) setMenuOpen(false);
    onToggle();
  };
  const activeSort = WORKOUT_SORT_OPTIONS.find((option) => option.mode === sortMode);

  const animateNext = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleSelectSort = (mode: WorkoutSortMode) => {
    hapticTap();
    animateNext();
    setMenuOpen(false);
    onChangeSort(mode);
    if (!expanded) onToggle();
  };

  const moveWorkout = useCallback((index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= workouts.length) return;
    const next = workouts.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    hapticTap();
    onReorder(next);
  }, [onReorder, workouts]);

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<WorkoutDefinition>) => {
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator activeScale={1.02}>
        <WorkoutCard
          workout={item}
          onStart={() => onStart(item.id)}
          onEdit={() => onEdit(item.id)}
          onDelete={() => onDelete(item.id)}
          drag={canReorder ? drag : undefined}
          isActive={isActive}
          onMoveUp={canReorder ? () => moveWorkout(index, -1) : undefined}
          onMoveDown={canReorder ? () => moveWorkout(index, 1) : undefined}
          canMoveUp={index > 0}
          canMoveDown={index < workouts.length - 1}
        />
      </ScaleDecorator>
    );
  }, [canReorder, moveWorkout, onDelete, onEdit, onStart, workouts.length]);

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <TouchableOpacity
          style={styles.categoryHeaderMain}
          onPress={toggleExpanded}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <View style={[styles.categoryIcon, { backgroundColor: config.color + '22' }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>{config.title}</Text>
            <Text style={styles.categoryDesc}>{config.description}</Text>
          </View>
        </TouchableOpacity>

        {canSort && (
          <TouchableOpacity
            style={[
              styles.sortBtn,
              (menuOpen || sortMode !== 'custom') && { backgroundColor: config.color + '22' },
            ]}
            onPress={() => {
              hapticTap();
              setMenuOpen((open) => !open);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Sort ${config.title}`}
            accessibilityState={{ expanded: menuOpen }}
          >
            <Ionicons
              name="swap-vertical"
              size={16}
              color={sortMode === 'custom' && !menuOpen ? Colors.textSecondary : config.color}
            />
            {sortMode !== 'custom' && activeSort && (
              <Text style={[styles.sortBtnText, { color: config.color }]}>{activeSort.short}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.categoryRight}
          onPress={toggleExpanded}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${config.title}`}
        >
          <View style={[styles.countBadge, { backgroundColor: config.color + '22' }]}>
            <Text style={[styles.countText, { color: config.color }]}>{workouts.length}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {menuOpen && canSort && (
        <View style={styles.sortMenu}>
          {WORKOUT_SORT_OPTIONS.map((option) => {
            const selected = option.mode === sortMode;
            return (
              <TouchableOpacity
                key={option.mode}
                style={[styles.sortOption, selected && styles.sortOptionSelected]}
                onPress={() => handleSelectSort(option.mode)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.sortOptionText}>
                  <Text style={[styles.sortOptionLabel, selected && styles.sortOptionLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.sortOptionDetail}>{option.detail}</Text>
                </View>
                {selected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {expanded && (
        <View style={styles.categoryBody}>
          {workouts.length === 0 ? (
            <Text style={styles.emptyCategory}>No workouts in this category yet</Text>
          ) : canReorder ? (
            <>
              <Text style={styles.reorderHint}>Hold the handle to drag, or tap the arrows</Text>
              <NestableDraggableFlatList
                data={workouts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                onDragBegin={() => {
                  hapticTap();
                }}
                onDragEnd={({ data, from, to }) => {
                  if (from !== to) onReorder(data);
                }}
                scrollEnabled={false}
                activationDistance={12}
                initialNumToRender={workouts.length}
              />
            </>
          ) : (
            workouts.map((item) => (
              <WorkoutCard
                key={item.id}
                workout={item}
                onStart={() => onStart(item.id)}
                onEdit={() => onEdit(item.id)}
                onDelete={() => onDelete(item.id)}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  categorySection: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  categoryHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  sortBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  sortMenu: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  sortOptionSelected: {
    backgroundColor: Colors.primary + '14',
  },
  sortOptionText: {
    flex: 1,
  },
  sortOptionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sortOptionLabelSelected: {
    color: Colors.primary,
  },
  sortOptionDetail: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  categoryBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  reorderHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  emptyCategory: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
