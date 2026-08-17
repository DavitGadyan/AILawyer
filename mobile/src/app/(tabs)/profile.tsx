import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, Loading } from '@/components/Bits';
import { Avatar } from '@/components/Avatar';
import { Card, SectionHeader } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { colors, radius, spacing, type } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, locale, setLocale, signOut } = useApp();

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: api.sessions,
    enabled: Boolean(user),
  });

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <Screen>
      <AppHeader title={t('profile.title')} showBack={false} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.identity}>
          <Avatar name={user?.full_name ?? 'Guest'} size={54} />
          <View style={styles.identityText}>
            <Text style={type.h2} numberOfLines={1}>
              {user?.full_name ?? 'Guest'}
            </Text>
            <Text style={type.caption} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
        </Card>

        <SectionHeader title={t('profile.language')} style={styles.section} />
        <View style={styles.localeRow}>
          <Chip
            label="English"
            prefix="🇬🇧"
            selected={locale === 'en'}
            onPress={() => setLocale('en')}
          />
          <Chip
            label="Español"
            prefix="🇪🇸"
            selected={locale === 'es'}
            onPress={() => setLocale('es')}
          />
        </View>

        <SectionHeader title={t('profile.myCases')} style={styles.section} />
        {sessions.isLoading ? (
          <Loading />
        ) : sessions.data?.length ? (
          sessions.data.map((session) => (
            <Card
              key={session.id}
              onPress={() => router.push(`/chat/${session.id}`)}
              style={styles.sessionRow}
            >
              <View style={styles.sessionIcon}>
                <Ionicons
                  name={session.has_profile ? 'document-text-outline' : 'chatbubble-outline'}
                  size={17}
                  color={colors.taupe}
                />
              </View>
              <View style={styles.sessionText}>
                <Text style={type.title} numberOfLines={1}>
                  {session.title}
                </Text>
                <Text style={type.caption}>
                  {session.jurisdiction} · {new Date(session.updated_at).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
            </Card>
          ))
        ) : (
          <EmptyState icon="folder-open-outline" title={t('profile.noCases')} />
        )}

        <SectionHeader title={t('profile.about')} style={styles.section} />
        <Card style={styles.about}>
          <Text style={type.bodyMuted}>{t('profile.aboutBody')}</Text>
          <View style={styles.divider} />
          <Text style={styles.legal}>{t('disclaimer.body')}</Text>
        </Card>

        <PillButton
          label={t('profile.signOut')}
          variant="ghost"
          icon="log-out-outline"
          onPress={handleSignOut}
          style={styles.signOut}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  section: {
    marginTop: spacing.xxl,
  },
  localeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.icon,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionText: {
    flex: 1,
    gap: 1,
  },
  about: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  legal: {
    ...type.caption,
    fontSize: 12,
    lineHeight: 17,
  },
  signOut: {
    marginTop: spacing.xxl,
  },
});
