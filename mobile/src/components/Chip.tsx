import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, type } from '@/theme/tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Rendered before the label — used for the jurisdiction flags. */
  prefix?: string;
  style?: StyleProp<ViewStyle>;
}

/** Selectable pill: jurisdiction switcher, directory filters. */
export function Chip({ label, selected = false, onPress, prefix, style }: ChipProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      style={[styles.chip, selected ? styles.selected : styles.unselected, style]}
    >
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Wrapper>
  );
}

/** Static, non-interactive tag — "10 yr exp", "219 cases". */
export function Tag({ label, style }: { label: string; style?: ViewStyle }) {
  return (
    <View style={[styles.tag, style]}>
      <Text style={styles.tagLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  prefix: {
    fontSize: 14,
  },
  label: {
    ...type.captionStrong,
    fontSize: 13,
    color: colors.inkMuted,
  },
  labelSelected: {
    color: colors.white,
  },
  tag: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceAlt,
  },
  tagLabel: {
    ...type.label,
    fontSize: 11.5,
    color: colors.inkMuted,
  },
});
