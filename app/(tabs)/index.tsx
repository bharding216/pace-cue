/**
 * Home screen — list of saved workouts with a big "New Workout" button.
 * Workouts can be reordered by long-pressing and dragging.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { onSyncStatusChange } from '../../src/sync/cloudSync';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Reload after cloud sync finishes so new-user data appears immediately
  useEffect(() => {
    return onSyncStatusChange((status) => {
      if (status === 'success') reload();
    });
  }, [reload]);

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
          <>
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
                <Ionicons name="sparkles" size={16} color={Colors.black} />
                <Text style={styles.aiFabText}>AI Builder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newBtn}
                onPress={() => router.push('/workout/new')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color={Colors.black} />
                <Text style={styles.newBtnText}>New Workout</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No workouts yet. Create one to get started!
          </Text>
        }
      />
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
  aiFab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  aiFabText: {
    color: Colors.black,
    fontSize: FontSize.sm,
    fontWeight: '800',
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
