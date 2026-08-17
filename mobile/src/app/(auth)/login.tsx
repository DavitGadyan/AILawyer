import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorNote, Field } from '@/components/Bits';
import { AppHeader } from '@/components/AppHeader';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { spacing, type } from '@/theme/tokens';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useApp();

  const [email, setEmail] = useState('mike@example.com');
  const [password, setPassword] = useState('demo12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader onBack={() => router.replace('/')} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={type.h1}>{t('auth.loginTitle')}</Text>
            <Text style={type.bodyMuted}>{t('auth.loginSubtitle')}</Text>
          </View>

          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            placeholder="••••••••"
          />

          {error ? <ErrorNote message={error} style={styles.error} /> : null}

          <PillButton label={t('auth.login')} onPress={submit} loading={busy} />

          <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
            <Text style={styles.link}>{t('auth.noAccount')}</Text>
          </Pressable>

          <Text style={styles.demo}>{t('auth.demoHint')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.xxl,
    paddingTop: spacing.md,
  },
  intro: {
    gap: spacing.xs,
    marginBottom: spacing.xxl,
  },
  error: {
    marginBottom: spacing.lg,
  },
  link: {
    ...type.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  demo: {
    ...type.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xxxl,
    opacity: 0.8,
  },
});
