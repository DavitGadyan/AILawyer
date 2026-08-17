import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JusticeHero } from '@/components/JusticeHero';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { colors, radius, shadow, spacing, type } from '@/theme/tokens';

/** Onboarding — the shot's first screen, adapted to immigration. */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, locale, setLocale } = useApp();

  const start = () => router.replace(user ? '/(tabs)/home' : '/(auth)/login');

  return (
    <Screen edges={['top']} bare>
      <View style={styles.localeRow}>
        <LocaleToggle
          current={locale}
          onChange={(next) => setLocale(next)}
        />
      </View>

      <View style={styles.heroArea}>
        <JusticeHero size={320} />
      </View>

      <View style={[styles.sheet, shadow.soft, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Text style={styles.headline}>
          {t('onboarding.titleLead')}{'\n'}
          <Text style={type.displayStrong}>{t('onboarding.titleStrong')}</Text>
        </Text>

        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

        <PillButton
          label={t('onboarding.cta')}
          icon="arrow-forward"
          onPress={start}
          style={styles.cta}
        />

        {user ? null : (
          <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
            <Text style={styles.signIn}>{t('onboarding.signIn')}</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

function LocaleToggle({
  current,
  onChange,
}: {
  current: string;
  onChange: (next: 'en' | 'es') => void;
}) {
  return (
    <View style={styles.toggle}>
      {(['en', 'es'] as const).map((code) => {
        const active = current === code;
        return (
          <Pressable
            key={code}
            onPress={() => onChange(code)}
            style={[styles.toggleItem, active && styles.toggleItemActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  localeRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 2,
  },
  toggleItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.chip,
  },
  toggleItemActive: {
    backgroundColor: colors.ink,
  },
  toggleLabel: {
    ...type.label,
    fontSize: 11.5,
    color: colors.inkMuted,
  },
  toggleLabelActive: {
    color: colors.white,
  },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  headline: {
    ...type.display,
    textAlign: 'center',
  },
  subtitle: {
    ...type.bodyMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
  signIn: {
    ...type.caption,
    marginTop: spacing.xs,
  },
});
