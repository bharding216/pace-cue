/**
 * Home screen — categorized workout list with collapsible sections.
 * Each category can be sorted, or reordered by hand in custom order.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  WorkoutDefinition,
  categorizeWorkout,
  WorkoutCategory,
} from '../../src/workout/workoutTypes';
import { loadWorkouts, deleteWorkout, saveWorkouts } from '../../src/workout/workoutStorage';
import {
  CategorySortPrefs,
  loadCategorySortPrefs,
  orderWorkouts,
  reorderCategory,
  saveCategorySortPref,
  WorkoutSortMode,
} from '../../src/workout/workoutOrder';
import { createPresets, getMissingDistancePresets } from '../../src/workout/presets';
import {
  CATEGORIES,
  CategoryWorkoutSection,
} from '../../src/components/CategoryWorkoutSection';
import { useAuth } from '../../src/contexts/AuthContext';
import { onSyncStatusChange } from '../../src/sync/cloudSync';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [sortPrefs, setSortPrefs] = useState<CategorySortPrefs>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<WorkoutCategory>>(new Set());
  const workoutsRef = useRef(workouts);
  workoutsRef.current = workouts;

  const reload = useCallback(async () => {
    const [stored, prefs] = await Promise.all([
      loadWorkouts(),
      loadCategorySortPrefs(),
    ]);
    let data = stored;
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
    setSortPrefs(prefs);
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

  const handleSortChange = useCallback(async (category: WorkoutCategory, mode: WorkoutSortMode) => {
    setSortPrefs((prev) => ({ ...prev, [category]: mode }));
    await saveCategorySortPref(category, mode);
  }, []);

  const handleReorder = useCallback(async (category: WorkoutCategory, ordered: WorkoutDefinition[]) => {
    const next = reorderCategory(workoutsRef.current, category, ordered);
    setWorkouts(next);
    await saveWorkouts(next);
  }, []);

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

  const grouped = useMemo(() => {
    const acc: Record<WorkoutCategory, WorkoutDefinition[]> = {
      easy: [],
      tempo: [],
      intervals: [],
      long_run: [],
      race: [],
    };
    for (const workout of workouts) {
      const category = categorizeWorkout(workout);
      if (acc[category]) acc[category].push(workout);
    }
    (Object.keys(acc) as WorkoutCategory[]).forEach((category) => {
      acc[category] = orderWorkouts(acc[category], sortPrefs[category] ?? 'custom');
    });
    return acc;
  }, [workouts, sortPrefs]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NestableScrollContainer
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

        {CATEGORIES.map((cat) => (
          <CategoryWorkoutSection
            key={cat.key}
            config={cat}
            workouts={grouped[cat.key]}
            sortMode={sortPrefs[cat.key] ?? 'custom'}
            expanded={expanded.has(cat.key)}
            onToggle={() => toggleCategory(cat.key)}
            onChangeSort={(mode) => handleSortChange(cat.key, mode)}
            onReorder={(ordered) => handleReorder(cat.key, ordered)}
            onStart={(id) => router.push(`/workout/run/${id}`)}
            onEdit={(id) => router.push(`/workout/${id}`)}
            onDelete={handleDelete}
          />
        ))}

        {workouts.length === 0 && (
          <Text style={styles.emptyText}>
            No workouts yet. Create one to get started!
          </Text>
        )}
      </NestableScrollContainer>
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

  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
