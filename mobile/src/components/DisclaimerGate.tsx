import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/PillButton';
import { useApp } from '@/store/app-context';
import { colors, radius, shadow, spacing, type, PHONE_MAX_WIDTH } from '@/theme/tokens';

/**
 * One-time legal acknowledgement. Immigration advice carries real consequences,
 * so the boundary is stated before the user can reach the assistant.
 */
export function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { disclaimerAccepted, acceptDisclaimer } = useApp();

  return (
    <>
      {children}
      <Modal visible={!disclaimerAccepted} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, shadow.soft]}>
            <View style={styles.icon}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.taupe} />
            </View>
            <Text style={type.h1}>{t('disclaimer.title')}</Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={type.bodyMuted}>{t('disclaimer.body')}</Text>
            </ScrollView>
            <PillButton label={t('disclaimer.accept')} onPress={acceptDisclaimer} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 8, 0.45)',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: 220,
    marginBottom: spacing.sm,
  },
});
