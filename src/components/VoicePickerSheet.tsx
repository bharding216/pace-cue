/**
 * Bottom-sheet voice picker with search and quality filter.
 *
 * Opens as a modal overlay that slides up from the bottom.
 * Voices are rendered in a FlatList (virtualised) so even 50+ items stay smooth.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { hapticTap } from '../audio/haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;
const ANIM_MS = 280;

/** Strip noisy Android prefixes so voice names are human-readable. */
function formatVoiceName(voice: Speech.Voice): string {
  let name = voice.name;
  if (name.startsWith('en-') && name.includes('#')) {
    name = name.split('#').pop() ?? name;
  }
  const quality =
    voice.quality === Speech.VoiceQuality.Enhanced ? ' (Enhanced)' : '';
  if (name.includes('Enhanced') || name.includes('Premium')) return name;
  return `${name}${quality}`;
}

interface Props {
  visible: boolean;
  voices: Speech.Voice[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPreview: (id: string | null) => void;
  onClose: () => void;
}

export default function VoicePickerSheet({
  visible,
  voices,
  selectedId,
  onSelect,
  onPreview,
  onClose,
}: Props) {
  const [search, setSearch] = useState('');
  const [enhancedOnly, setEnhancedOnly] = useState(false);
  const searchRef = useRef<TextInput>(null);

  // Slide animation
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdrop = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const open = useCallback(() => {
    translateY.value = withTiming(0, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(1, { duration: ANIM_MS });
  }, [translateY, backdropOpacity]);

  const close = useCallback(() => {
    translateY.value = withTiming(SHEET_HEIGHT, {
      duration: ANIM_MS,
      easing: Easing.in(Easing.cubic),
    });
    backdropOpacity.value = withTiming(0, { duration: ANIM_MS });
    setTimeout(() => {
      setSearch('');
      setEnhancedOnly(false);
      onClose();
    }, ANIM_MS);
  }, [translateY, backdropOpacity, onClose]);

  // Filter voices
  const filtered = useMemo(() => {
    let list = voices;
    if (enhancedOnly) {
      list = list.filter((v) => v.quality === Speech.VoiceQuality.Enhanced);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.language.toLowerCase().includes(q) ||
          formatVoiceName(v).toLowerCase().includes(q),
      );
    }
    return list;
  }, [voices, enhancedOnly, search]);

  const hasEnhanced = useMemo(
    () => voices.some((v) => v.quality === Speech.VoiceQuality.Enhanced),
    [voices],
  );

  const handleSelect = useCallback(
    (id: string | null) => {
      hapticTap();
      onSelect(id);
      onPreview(id);
    },
    [onSelect, onPreview],
  );

  const renderVoice = useCallback(
    ({ item }: { item: Speech.Voice }) => {
      const active = selectedId === item.identifier;
      return (
        <TouchableOpacity
          style={[styles.voiceRow, active && styles.voiceRowActive]}
          onPress={() => handleSelect(item.identifier)}
          activeOpacity={0.7}
        >
          <View style={styles.voiceInfo}>
            <Text style={[styles.voiceName, active && styles.voiceNameActive]}>
              {formatVoiceName(item)}
            </Text>
            <Text style={styles.voiceSub}>{item.language}</Text>
          </View>
          {item.quality === Speech.VoiceQuality.Enhanced && (
            <View style={styles.enhancedBadge}>
              <Text style={styles.enhancedBadgeText}>Enhanced</Text>
            </View>
          )}
          {active && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [selectedId, handleSelect],
  );

  const keyExtractor = useCallback((v: Speech.Voice) => v.identifier, []);

  const ListHeader = useMemo(
    () => (
      <TouchableOpacity
        style={[styles.voiceRow, selectedId === null && styles.voiceRowActive]}
        onPress={() => handleSelect(null)}
        activeOpacity={0.7}
      >
        <View style={styles.voiceInfo}>
          <Text
            style={[
              styles.voiceName,
              selectedId === null && styles.voiceNameActive,
            ]}
          >
            Auto (best available)
          </Text>
          <Text style={styles.voiceSub}>
            Picks the highest-quality voice on your device
          </Text>
        </View>
        {selectedId === null && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    ),
    [selectedId, handleSelect],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={open}
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[styles.backdrop, animatedBackdrop]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, animatedSheet]}>
          {/* Handle */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>Choose a Voice</Text>
            <TouchableOpacity onPress={close} activeOpacity={0.7}>
              <Text style={styles.doneBtn}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                placeholder="Search voices…"
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Enhanced filter chip (only show if enhanced voices exist) */}
            {hasEnhanced && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  enhancedOnly && styles.filterChipActive,
                ]}
                onPress={() => {
                  hapticTap();
                  setEnhancedOnly((prev) => !prev);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    enhancedOnly && styles.filterChipTextActive,
                  ]}
                >
                  ✨ Enhanced
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Voice count */}
          <Text style={styles.countLabel}>
            {filtered.length} voice{filtered.length !== 1 ? 's' : ''}
            {enhancedOnly ? ' (enhanced only)' : ''}
          </Text>

          {/* Voice list */}
          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderVoice}
            ListHeaderComponent={!search.trim() && !enhancedOnly ? ListHeader : null}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No voices match your search.
              </Text>
            }
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  doneBtn: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 14,
    color: Colors.textMuted,
    paddingLeft: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm + 2,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  countLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLight,
  },
  voiceRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  voiceNameActive: {
    color: Colors.primary,
  },
  voiceSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  enhancedBadge: {
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  enhancedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  checkmark: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
