/**
 * TagPicker — grouped tag chips for labeling completed workouts.
 *
 * Renders each tag group (Run Type, How It Felt, etc.) with tappable chips.
 * Supports multi-select and fires onChange with the updated tag array.
 * Can render in full (post-workout) or compact (inline history) mode.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WORKOUT_TAG_GROUPS, type WorkoutTagCategory } from '../workout/workoutTypes';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { hapticTap } from '../audio/haptics';

const CATEGORY_COLORS: Record<WorkoutTagCategory, string> = {
  type: Colors.accent,
  feel: Colors.danger,
  effort: '#F59E0B',
  weather: Colors.primary,
  social: '#A78BFA',
};

interface TagPickerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  /** Compact mode hides group headers and uses a horizontal scroll. */
  compact?: boolean;
}

export function TagPicker({ selected, onChange, compact }: TagPickerProps) {
  const toggle = (tag: string) => {
    hapticTap();
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  if (compact) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.compactRow}
      >
        {WORKOUT_TAG_GROUPS.flatMap((group) =>
          group.tags.map((tag) => {
            const isActive = selected.includes(tag);
            const color = CATEGORY_COLORS[group.category];
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.chip,
                  isActive && { borderColor: color, backgroundColor: color + '22' },
                ]}
                onPress={() => toggle(tag)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && { color },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          }),
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {WORKOUT_TAG_GROUPS.map((group) => {
        const color = CATEGORY_COLORS[group.category];
        return (
          <View key={group.category} style={styles.group}>
            <View style={styles.groupHeader}>
              <Ionicons
                name={group.icon as any}
                size={14}
                color={color}
              />
              <Text style={[styles.groupLabel, { color }]}>{group.label}</Text>
            </View>
            <View style={styles.chipGrid}>
              {group.tags.map((tag) => {
                const isActive = selected.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.chip,
                      isActive && {
                        borderColor: color,
                        backgroundColor: color + '22',
                      },
                    ]}
                    onPress={() => toggle(tag)}
                    activeOpacity={0.7}
                  >
                    {isActive && (
                      <Ionicons name="checkmark" size={12} color={color} />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        isActive && { color },
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Inline read-only tag display for history cards. */
export function TagBadges({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <View style={styles.badgeRow}>
      {tags.map((tag) => {
        const group = WORKOUT_TAG_GROUPS.find((g) =>
          (g.tags as readonly string[]).includes(tag),
        );
        const color = group ? CATEGORY_COLORS[group.category] : Colors.textMuted;
        return (
          <View
            key={tag}
            style={[styles.badge, { borderColor: color + '44', backgroundColor: color + '14' }]}
          >
            <Text style={[styles.badgeText, { color }]}>{tag}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  group: {
    gap: Spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  groupLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs + 1,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surfaceLight,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  compactRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },

  // Read-only badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.xs,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
