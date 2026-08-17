import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
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

import { api } from '@/api/client';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { ErrorNote, Loading } from '@/components/Bits';
import { Card } from '@/components/Card';
import { Composer } from '@/components/Composer';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { colors, radius, spacing, type } from '@/theme/tokens';

export default function ThreadScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const threadId = Number(id);
  const { locale } = useApp();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [reported, setReported] = useState(false);

  const thread = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api.forumThread(threadId),
    enabled: Number.isFinite(threadId),
  });

  const reply = useMutation({
    mutationFn: (body: string) => api.createPost(threadId, body),
    onSuccess: () => {
      setDraft('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('common.error')),
  });

  const report = async () => {
    try {
      await api.reportContent({ thread_id: threadId, reason: 'Reported from the app' });
      setReported(true);
    } catch {
      setError(t('common.error'));
    }
  };

  if (thread.isLoading) {
    return (
      <Screen>
        <AppHeader />
        <Loading />
      </Screen>
    );
  }

  if (thread.isError || !thread.data) {
    return (
      <Screen>
        <AppHeader />
        <ErrorNote message={t('common.error')} style={styles.pad} />
      </Screen>
    );
  }

  const data = thread.data;

  return (
    <Screen>
      <AppHeader
        title={t('forum.title')}
        rightIcon="flag-outline"
        onRightPress={report}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={type.h1}>{data.title}</Text>

          <View style={styles.author}>
            <Avatar name={data.author.full_name} size={30} />
            <Text style={styles.authorName}>{data.author.full_name}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={type.caption}>
              {new Date(data.created_at).toLocaleDateString()}
            </Text>
          </View>

          <Card style={styles.opening}>
            <Text style={type.body}>{data.body}</Text>
          </Card>

          <Text style={styles.replyCount}>
            {t('forum.replies', { count: data.posts.length })}
          </Text>

          {data.posts.map((post) => (
            <Card key={post.id} style={styles.post}>
              <View style={styles.postHeader}>
                <Avatar name={post.author.full_name} size={26} />
                <Text style={styles.authorName}>{post.author.full_name}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={type.caption}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={type.body}>{post.body}</Text>
            </Card>
          ))}

          {reported ? (
            <View style={styles.reported}>
              <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
              <Text style={styles.reportedText}>{t('forum.reported')}</Text>
            </View>
          ) : null}

          {error ? <ErrorNote message={error} style={styles.error} /> : null}
        </ScrollView>

        {data.is_locked ? (
          <View style={styles.locked}>
            <Ionicons name="lock-closed-outline" size={15} color={colors.subtle} />
            <Text style={type.caption}>{t('forum.locked')}</Text>
          </View>
        ) : (
          <View style={styles.composerWrap}>
            <Composer
              value={draft}
              onChangeText={setDraft}
              onSend={() => draft.trim() && reply.mutate(draft.trim())}
              placeholder={t('forum.reply')}
              speakLabel={t('home.speak')}
              locale={locale}
              busy={reply.isPending}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  pad: {
    margin: spacing.xl,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  authorName: {
    ...type.captionStrong,
    fontSize: 13,
  },
  dot: {
    ...type.caption,
  },
  opening: {
    padding: spacing.lg,
  },
  replyCount: {
    ...type.label,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  post: {
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reported: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  reportedText: {
    ...type.caption,
    color: colors.success,
  },
  error: {
    marginTop: spacing.lg,
  },
  composerWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xl,
    borderRadius: radius.cardSm,
    margin: spacing.xl,
    backgroundColor: colors.surfaceAlt,
  },
});
