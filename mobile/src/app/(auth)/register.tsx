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

import { AppHeader } from '@/components/AppHeader';
import { ErrorNote, Field } from '@/components/Bits';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { spacing, type } from '@/theme/tokens';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await signUp(email, password, fullName);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={type.h1}>{t('auth.registerTitle')}</Text>
            <Text style={type.bodyMuted}>{t('auth.registerSubtitle')}</Text>
          </View>

          <Field
            label={t('auth.fullName')}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            placeholder="Mike Alvarez"
          />
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
            autoComplete="new-password"
            placeholder="••••••••"
            hint={t('auth.passwordHint')}
          />

          {error ? <ErrorNote message={error} style={styles.error} /> : null}

          <PillButton label={t('auth.register')} onPress={submit} loading={busy} />

          <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
            <Text style={styles.link}>{t('auth.hasAccount')}</Text>
          </Pressable>
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
});
