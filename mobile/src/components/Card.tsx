import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing, type } from '@/theme/tokens';

/** White surface with the shot's 24px radius and one soft shadow. */
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadow.soft, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, shadow.soft, style]}>{children}</View>;
}

/** The circular icon chip that leads every card row in the shot. */
export function IconChip({
  name,
  size = 40,
  tone = 'neutral',
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  tone?: 'neutral' | 'warm' | 'dark';
}) {
  const bg =
    tone === 'warm' ? colors.tan : tone === 'dark' ? colors.ink : colors.surfaceAlt;
  const fg = tone === 'dark' ? colors.white : tone === 'warm' ? colors.taupe : colors.taupe;
  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Ionicons name={name} size={size * 0.45} color={fg} />
    </View>
  );
}

/** "Suggested Topics" + "See all" — the section header pattern from the shot. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={type.h2}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={type.caption}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
