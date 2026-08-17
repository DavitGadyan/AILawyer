import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '@/api/client';
import type { Jurisdiction, Practice } from '@/api/types';
import { ActionSheet } from '@/components/ActionSheet';
import { AppHeader } from '@/components/AppHeader';
import { PracticeSwitcher } from '@/components/PracticeSwitcher';
import { DisclaimerChip, EmptyState, Loading } from '@/components/Bits';
import { SectionHeader } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Composer } from '@/components/Composer';
import { Screen } from '@/components/Screen';
import { TopicCard } from '@/components/TopicCard';
import { useApp } from '@/store/app-context';
import { jurisdictions, jurisdictionsFor, spacing, type } from '@/theme/tokens';

/** The shot's second screen: greeting, headline, jurisdiction, topics, composer. */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, locale, practice, jurisdiction, setPractice, setJurisdiction } = useApp();
  const [draft, setDraft] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);
  const isTax = practice === 'tax';

  const topics = useQuery({
    queryKey: ['topics', practice, jurisdiction, locale],
    queryFn: () => api.topics(practice, jurisdiction, locale),
  });

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: api.sessions,
    enabled: Boolean(user),
  });

  const ask = (text: string) => {
    const message = text.trim();
    if (!message) return;
    setDraft('');
    router.push({
      pathname: '/chat/new',
      params: { q: message, practice, jurisdiction },
    });
  };

  // Offer the jurisdictions for the active practice, in that practice's own order —
  // tax questions start from the founder's country, so the UK leads there.
  const activeJurisdictions = jurisdictionsFor[practice]
    .map((code) => jurisdictions.find((j) => j.code === code))
    .filter((j): j is (typeof jurisdictions)[number] => Boolean(j));

  const firstName = (user?.full_name || 'there').split(' ')[0];

  return (
    <Screen>
      <AppHeader
        title={t('home.greeting', { name: firstName })}
        showBack={false}
        rightIcon="chatbubble-ellipses-outline"
        rightBadge={(sessions.data?.length ?? 0) > 0}
        onRightPress={() => router.push('/(tabs)/profile')}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PracticeSwitcher
            value={practice}
            onChange={(next: Practice) => setPractice(next)}
          />

          <Text style={styles.headline}>
            {t(isTax ? 'tax.titleLead' : 'home.titleLead')}{' '}
            <Text style={type.displayStrong}>
              {t(isTax ? 'tax.titleStrong' : 'home.titleStrong')}
            </Text>
          </Text>
          <Text style={styles.subtitle}>
            {t(isTax ? 'tax.subtitle' : 'home.subtitle')}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jurisdictionRow}
            style={styles.jurisdictionStrip}
          >
            {activeJurisdictions.map((j) => (
              <Chip
                key={j.code}
                label={t(j.labelKey)}
                prefix={j.flag}
                selected={jurisdiction === j.code}
                onPress={() => setJurisdiction(j.code as Jurisdiction)}
              />
            ))}
          </ScrollView>

          <SectionHeader
            title={t('home.suggested')}
            actionLabel={t('common.seeAll')}
            onAction={() => router.push('/(tabs)/lawyers')}
            style={styles.section}
          />

          {topics.isLoading ? (
            <Loading />
          ) : topics.data?.length ? (
            topics.data.map((topic) => (
              <TopicCard
                key={topic.id}
                icon={topic.icon}
                title={topic.title}
                subtitle={topic.subtitle}
                onPress={() => ask(topic.prompt)}
              />
            ))
          ) : (
            <EmptyState icon="albums-outline" title={t('home.noTopics')} />
          )}
        </ScrollView>

        <View style={styles.composerWrap}>
          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={() => ask(draft)}
            placeholder={t(isTax ? 'tax.placeholder' : 'home.placeholder')}
            speakLabel={t('home.speak')}
            locale={locale}
            onPlus={() => setActionsOpen(true)}
            minHeight={52}
          />
          <DisclaimerChip
            label={t(isTax ? 'tax.disclaimerChip' : 'disclaimer.chip')}
            style={styles.disclaimer}
          />
        </View>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={actionsOpen}
        title={t('quick.title')}
        cancelLabel={t('common.cancel')}
        onClose={() => setActionsOpen(false)}
        actions={[
          {
            key: 'checklist',
            icon: isTax ? 'cash-outline' : 'document-text-outline',
            label: isTax ? t('quick.costs') : t('quick.checklist'),
            description: isTax ? t('quick.costsDesc') : t('quick.checklistDesc'),
            onPress: () =>
              ask(isTax ? t('quick.costsPrompt') : t('quick.checklistPrompt')),
          },
          {
            key: 'lawyer',
            icon: 'people-outline',
            label: isTax ? t('quick.findAdviser') : t('quick.findLawyer'),
            description: isTax ? t('quick.findAdviserDesc') : t('quick.findLawyerDesc'),
            onPress: () => router.push('/(tabs)/lawyers'),
          },
          {
            key: 'community',
            icon: 'chatbubbles-outline',
            label: t('quick.askCommunity'),
            description: t('quick.askCommunityDesc'),
            onPress: () => router.push('/(tabs)/forum'),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headline: {
    ...type.display,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...type.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  jurisdictionStrip: {
    height: 38,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.xl,
  },
  jurisdictionRow: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  section: {
    marginTop: spacing.xs,
  },
  composerWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  disclaimer: {
    marginTop: 2,
  },
});
