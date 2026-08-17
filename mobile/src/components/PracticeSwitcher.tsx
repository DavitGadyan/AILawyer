import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Practice } from '@/api/types';
import { colors, practices, radius, spacing, type } from '@/theme/tokens';

/**
 * Two-way segmented control between the app's practice areas.
 *
 * Uses the same pill idiom as the jurisdiction chips: a track on `surfaceAlt`
 * with the active segment lifted onto `ink`.
 */
export function PracticeSwitcher({
  value,
  onChange,
}: {
  value: Practice;
  onChange: (next: Practice) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {practices.map((item) => {
        const active = item.code === value;
        return (
          <Pressable
            key={item.code}
            onPress={() => onChange(item.code)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && !active && styles.pressed,
            ]}
          >
            <Ionicons
              name={item.icon}
              size={15}
              color={active ? colors.white : colors.inkMuted}
            />
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {t(item.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...type.captionStrong,
    fontSize: 13,
    color: colors.inkMuted,
  },
  labelActive: {
    color: colors.white,
  },
});
