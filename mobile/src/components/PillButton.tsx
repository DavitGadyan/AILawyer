import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { colors, radius, type } from '@/theme/tokens';

interface Props {
  label: string;
  onPress?: () => void;
  /** 'primary' is the shot's black pill; 'ghost' is the outlined variant. */
  variant?: 'primary' | 'ghost' | 'light';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
}

/** The full-width black pill CTA ("Get Started →", "Book consultation"). */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  size = 'md',
  style,
}: Props) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const fg = isPrimary ? colors.white : colors.ink;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        isPrimary && styles.primary,
        isGhost && styles.ghost,
        variant === 'light' && styles.light,
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.content}>
          <Text
            style={[
              type.button,
              { color: fg },
              size === 'sm' && styles.smLabel,
            ]}
          >
            {label}
          </Text>
          {icon ? (
            <Ionicons name={icon} size={size === 'sm' ? 15 : 17} color={fg} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    height: 56,
    paddingHorizontal: 24,
  },
  sm: {
    height: 42,
    paddingHorizontal: 18,
  },
  smLabel: {
    fontSize: 14,
  },
  primary: {
    backgroundColor: colors.ink,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  light: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
