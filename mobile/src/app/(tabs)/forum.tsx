import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, Loading } from '@/components/Bits';
import { Card, IconChip, SectionHeader } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { topicIcon } from '@/components/TopicCard';
import { useApp } from '@/store/app-context';
import { colors, radius, spacing, type } from '@/theme/tokens';

export default function ForumScreen() {
  const { t } = useTranslation();
  const { locale } = useApp();
  const [categoryId, setCategoryId] = useState<number | undefined>();

  const categories = useQuery({
    queryKey: ['forum-categories', locale],
    queryFn: () => api.forumCategories(locale),
  });

  const threads = useQuery({
    queryKey: ['forum-threads', categoryId],
    queryFn: () => api.forumThreads({ category_id: categoryId, limit: 50 }),
  });

  return (
    <Screen>
      <AppHeader
        title={t('forum.title')}
        showBack={false}
        rightIcon="create-outline"
        onRightPress={() => router.push('/forum/new')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('forum.subtitle')}</Text>

        <SectionHeader title={t('forum.categories')} />
        {categories.isLoading ? (
          <Loading />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
            style={styles.catStrip}
          >
            <CategoryTile
              icon="chatbubbles"
              name={t('lawyers.allJurisdictions')}
              count={categories.data?.reduce((sum, c) => sum + c.thread_count, 0) ?? 0}
              selected={categoryId === undefined}
              onPress={() => setCategoryId(undefined)}
            />
            {categories.data?.map((category) => (
              <CategoryTile
                key={category.id}
                icon={category.icon}
                name={category.name}
                count={category.thread_count}
                selected={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </ScrollView>
        )}

        <SectionHeader title={t('forum.latest')} style={styles.latest} />

        {threads.isLoading ? (
          <Loading />
        ) : threads.data?.length ? (
          threads.data.map((thread) => (
            <Card
              key={thread.id}
              onPress={() => router.push(`/thread/${thread.id}`)}
              style={styles.thread}
            >
              <Text style={type.title} numberOfLines={2}>
                {thread.title}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {thread.body}
              </Text>
              <View style={styles.meta}>
                <Ionicons name="person-circle-outline" size={15} color={colors.subtle} />
                <Text style={styles.metaText}>{thread.author.full_name}</Text>
                <Text style={styles.dot}>·</Text>
                <Ionicons name="chatbubble-outline" size={13} color={colors.subtle} />
                <Text style={styles.metaText}>
                  {t('forum.replies', { count: thread.reply_count })}
                </Text>
                {thread.is_locked ? (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <Ionicons name="lock-closed" size={12} color={colors.subtle} />
                  </>
                ) : null}
              </View>
            </Card>
          ))
        ) : (
          <EmptyState icon="chatbubbles-outline" title={t('forum.empty')} />
        )}

        <View style={styles.guidelines}>
          <Ionicons name="heart-outline" size={14} color={colors.subtle} />
          <Text style={styles.guidelinesText}>{t('forum.guidelines')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function CategoryTile({
  icon,
  name,
  count,
  selected,
  onPress,
}: {
  icon: string;
  name: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      <IconChip name={topicIcon(icon)} size={34} tone={selected ? 'dark' : 'neutral'} />
      <Text style={[styles.tileName, selected && styles.tileNameSelected]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.tileCount}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  subtitle: {
    ...type.bodyMuted,
    marginBottom: spacing.xl,
  },
  catStrip: {
    height: 118,
    flexGrow: 0,
    flexShrink: 0,
  },
  catRow: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  tile: {
    width: 124,
    padding: spacing.md,
    borderRadius: radius.cardSm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 6,
  },
  tileSelected: {
    borderColor: colors.ink,
  },
  tileName: {
    ...type.captionStrong,
    fontSize: 13,
    color: colors.ink,
  },
  tileNameSelected: {
    color: colors.ink,
  },
  tileCount: {
    ...type.caption,
    fontSize: 11.5,
  },
  latest: {
    marginTop: spacing.xxl,
  },
  thread: {
    padding: spacing.lg,
    gap: 6,
    marginBottom: spacing.md,
  },
  body: {
    ...type.bodyMuted,
    fontSize: 13.5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  metaText: {
    ...type.caption,
    fontSize: 12,
  },
  dot: {
    ...type.caption,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  guidelines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  guidelinesText: {
    ...type.caption,
    fontSize: 12,
  },
});
