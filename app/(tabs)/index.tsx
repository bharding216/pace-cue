/**
 * Home screen — list of saved workouts with a big "New Workout" button.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { WorkoutDefinition } from '../../src/workout/workoutTypes';
import { loadWorkouts, deleteWorkout, saveWorkouts } from '../../src/workout/workoutStorage';
import { createPresets } from '../../src/workout/presets';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        let data = await loadWorkouts();
        if (data.length === 0) {
          // First launch — seed with presets
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>PaceCue</Text>
            <Text style={styles.heroSub}>Interval running, your way.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onStart={() => router.push(`/workout/run/${item.id}`)}
            onEdit={() => router.push(`/workout/${item.id}`)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No workouts yet. Create one to get started!
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/workout/new')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+ New Workout</Text>
      </TouchableOpacity>
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
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
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
