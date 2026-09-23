/**
 * Settings hub — cards that navigate to focused settings pages.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import { hapticTap } from '../../../src/audio/haptics';

interface SettingsCard {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  route: '/(tabs)/settings/audio' | '/(tabs)/settings/general' | '/(tabs)/settings/data' | '/(tabs)/settings/about';
}

const CARDS: SettingsCard[] = [
  {
    icon: 'volume-high-outline',
    title: 'Audio & Cues',
    description: 'Cue mode, voice, countdown warning, progress updates',
    route: '/(tabs)/settings/audio',
  },
  {
    icon: 'options-outline',
    title: 'General',
    description: 'Haptic feedback, screen behavior',
    route: '/(tabs)/settings/general',
  },
  {
    icon: 'cloud-outline',
    title: 'Backup & Restore',
    description: 'Export or import your workouts and history',
    route: '/(tabs)/settings/data',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'About & Feedback',
    description: 'Rate, share, send feedback',
    route: '/(tabs)/settings/about',
  },
];

export default function SettingsHubScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {CARDS.map((card) => (
        <TouchableOpacity
          key={card.route}
          style={styles.card}
          onPress={() => {
            hapticTap();
            router.push(card.route);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name={card.icon} size={26} color={Colors.textSecondary} />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDescription}>{card.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          PaceCue v{Constants.expoConfig?.version ?? '?'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
    gap: Spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardDescription: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
