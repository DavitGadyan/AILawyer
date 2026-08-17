import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/PillButton';
import {
  colors,
  PHONE_MAX_WIDTH,
  radius,
  shadow,
  spacing,
  type,
} from '@/theme/tokens';

export interface Action {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description?: string;
  onPress: () => void;
}

/** Bottom sheet of quick actions, opened by the composer's "+" button. */
export function ActionSheet({
  visible,
  title,
  actions,
  cancelLabel,
  onClose,
}: {
  visible: boolean;
  title: string;
  actions: Action[];
  cancelLabel: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, shadow.soft]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={type.h2}>{title}</Text>

          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon} size={18} color={colors.taupe} />
                </View>
                <View style={styles.actionText}>
                  <Text style={type.title}>{action.label}</Text>
                  {action.description ? (
                    <Text style={type.caption}>{action.description}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
              </Pressable>
            ))}
          </View>

          <PillButton label={cancelLabel} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 8, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: PHONE_MAX_WIDTH,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceAlt,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.icon,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
