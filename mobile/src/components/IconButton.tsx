import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme/tokens';

interface Props {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  /** 'light' is the white circle from the shot's header; 'dark' is the black one. */
  variant?: 'light' | 'dark';
  size?: number;
  badge?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** The circular icon button used in headers and the composer. */
export function IconButton({
  name,
  onPress,
  variant = 'light',
  size = 44,
  badge = false,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) {
  const dark = variant === 'dark';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: radius.icon },
        dark ? styles.dark : styles.light,
        !dark && shadow.subtle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons
        name={name}
        size={size * 0.42}
        color={dark ? colors.white : colors.ink}
      />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dark: {
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.4,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
