import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { colors, spacing, type } from '@/theme/tokens';

interface Props {
  title?: string;
  /** Left slot. Defaults to a back chevron when the stack can go back. */
  onBack?: () => void;
  showBack?: boolean;
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onRightPress?: () => void;
  rightBadge?: boolean;
  subtitle?: string;
}

/** Circular button · centred title · circular button — the shot's header. */
export function AppHeader({
  title,
  onBack,
  showBack = true,
  rightIcon,
  onRightPress,
  rightBadge = false,
  subtitle,
}: Props) {
  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {showBack ? (
          <IconButton name="chevron-back" onPress={handleBack} accessibilityLabel="Back" />
        ) : null}
      </View>

      <View style={styles.center}>
        {title ? (
          <Text style={type.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {rightIcon ? (
          <IconButton name={rightIcon} onPress={onRightPress} badge={rightBadge} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  side: {
    width: 44,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    ...type.caption,
    color: colors.subtle,
    fontSize: 12,
    marginTop: 1,
  },
});
