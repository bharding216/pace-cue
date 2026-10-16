/**
 * Home screen — categorized workout list with collapsible sections.
 * Categories: Distance Runs, Timed Runs, Intervals.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  WorkoutDefinition,
  categorizeWorkout,
  WorkoutCategory,
} from '../../src/workout/workoutTypes';
import { loadWorkouts, deleteWorkout, saveWorkouts } from '../../src/workout/workoutStorage';
import { createPresets } from '../../src/workout/presets';
import { WorkoutCard } from '../../src/components/WorkoutCard';
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

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'distance',
    title: 'Distance Runs',
    icon: 'navigate',
    description: 'GPS-tracked runs by distance',
    color: Colors.accent,
  },
  {
    key: 'timed',
    title: 'Timed Runs',
    icon: 'timer-outline',
    description: 'Steady runs by time',
    color: Colors.primary,
  },
  {
    key: 'intervals',
    title: 'Intervals',
    icon: 'repeat',
    description: 'Structured interval training',
    color: Colors.warning,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<WorkoutCategory>>(new Set());

  const reload = useCallback(async () => {
    let data = await loadWorkouts();
    if (data.length === 0) {
      data = createPresets();
      await saveWorkouts(data);
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

  // Group workouts by category
  const grouped = workouts.reduce<Record<WorkoutCategory, WorkoutDefinition[]>>(
    (acc, w) => {
      const cat = categorizeWorkout(w);
      acc[cat].push(w);
      return acc;
    },
    { distance: [], timed: [], intervals: [] }
  );

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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.heroLogo}
          />
          <View>
            <Text style={styles.heroTitle}>PaceCue</Text>
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
            <Text style={styles.newBtnText}>New Workout</Text>
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
                    items.map((item) => (
                      <WorkoutCard
                        key={item.id}
                        workout={item}
                        onStart={() => router.push(`/workout/run/${item.id}`)}
                        onEdit={() => router.push(`/workout/${item.id}`)}
                        onDelete={() => handleDelete(item.id)}
                        drag={() => {}}
                        isActive={false}
                      />
                    ))
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
    overflow: 'hidden',
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
