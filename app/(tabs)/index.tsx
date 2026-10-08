/**
 * Home screen — list of saved workouts with a big "New Workout" button.
 * Workouts can be reordered by long-pressing and dragging.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WorkoutDefinition } from '../../src/workout/workoutTypes';
import { loadWorkouts, deleteWorkout, saveWorkouts } from '../../src/workout/workoutStorage';
import { createPresets } from '../../src/workout/presets';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        let data = await loadWorkouts();
        if (data.length === 0) {
          data = createPresets();
          await saveWorkouts(data);
        }
        setWorkouts(data);
        setLoading(false);
      })();
    }, [])
  );

  const handleDelete = async (id: string) => {
    await deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const handleDragEnd = async ({ data }: { data: WorkoutDefinition[] }) => {
    setWorkouts(data);
    await saveWorkouts(data);
  };

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<WorkoutDefinition>) => (
      <ScaleDecorator>
        <WorkoutCard
          workout={item}
          onStart={() => router.push(`/workout/run/${item.id}`)}
          onEdit={() => router.push(`/workout/${item.id}`)}
          onDelete={() => handleDelete(item.id)}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    ),
    [router]
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
      <DraggableFlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        activationDistance={0}
        ListHeaderComponent={
          <View style={styles.hero}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.heroLogo}
            />
            <Text style={styles.heroTitle}>PaceCue</Text>
            <Text style={styles.heroSub}>Interval running, your way.</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No workouts yet. Create one to get started!
          </Text>
        }
      />

      {/* Bottom action buttons */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={styles.aiFab}
          onPress={() => {
            if (!user) {
              router.push('/login' as any);
            } else {
              router.push('/ai-builder' as any);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={18} color={Colors.black} />
          <Text style={styles.aiFabText}>AI Builder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/workout/new')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+ New Workout</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  hero: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  heroLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1,
  },
  heroSub: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  fabRow: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  aiFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  aiFabText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  fab: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  fabText: {
    color: Colors.black,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
});
