/**
 * About & Feedback — rate, share, send feedback, version info.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  Share,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import { hapticTap } from '../../../src/audio/haptics';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/pacecue-interval-timer/id6809834816';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.toddly.runningintervals';

export default function AboutSettingsScreen() {
  const handleShare = async () => {
    hapticTap();
    const storeUrl = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
    try {
      await Share.share({
        message: `Check out PaceCue — a free interval timer for runners with audio pacing cues. No subscriptions!\n\n${storeUrl}`,
        url: Platform.OS === 'ios' ? storeUrl : undefined,
      });
    } catch (_) {
      // User dismissed the share sheet
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Feedback</Text>
      <Text style={styles.sectionSub}>
        Have a feature request or found a bug? We'd love to hear from you.
      </Text>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => {
          hapticTap();
          const version = Constants.expoConfig?.version ?? '?';
          const subject = encodeURIComponent(
            `PaceCue Feedback (v${version})`,
          );
          Linking.openURL(
            `mailto:brandon@getsurmount.com?subject=${subject}`,
          );
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="mail-outline" size={20} color={Colors.textPrimary} />
        <Text style={styles.actionBtnLabel}>Send Feedback</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, { marginTop: Spacing.sm }]}
        onPress={async () => {
          hapticTap();
          const available = await StoreReview.isAvailableAsync();
          if (available) {
            StoreReview.requestReview();
          } else {
            Alert.alert(
              'Not Available',
              'In-app reviews are only available on production builds from the App Store or Play Store.',
            );
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="star-outline" size={20} color={Colors.textPrimary} />
        <Text style={styles.actionBtnLabel}>Rate PaceCue</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, { marginTop: Spacing.sm }]}
        onPress={handleShare}
        activeOpacity={0.7}
      >
        <Ionicons name="share-outline" size={20} color={Colors.textPrimary} />
        <Text style={styles.actionBtnLabel}>Share PaceCue</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          PaceCue v{Constants.expoConfig?.version ?? '?'}
        </Text>
        <Text style={styles.footerText}>
          Built with ❤️ for runners who don't want subscriptions
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
  },
  actionBtnLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  footer: {
    marginTop: Spacing.xxl * 2,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
