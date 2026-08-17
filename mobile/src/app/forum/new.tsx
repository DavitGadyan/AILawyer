import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { AppHeader } from '@/components/AppHeader';
import { ErrorNote, Field } from '@/components/Bits';
import { Chip } from '@/components/Chip';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { spacing, type } from '@/theme/tokens';

export default function NewThreadScreen() {
  const { t } = useTranslation();
  const { locale } = useApp();
  const queryClient = useQueryClient();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const categories = useQuery({
    queryKey: ['forum-categories', locale],
    queryFn: () => api.forumCategories(locale),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createThread({ category_id: categoryId!, title: title.trim(), body: body.trim() }),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] });
      queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
      router.replace(`/thread/${thread.id}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('common.error')),
  });

  const valid = categoryId !== null && title.trim().length >= 5 && body.trim().length >= 10;

  return (
    <Screen>
      <AppHeader title={t('forum.newThreadTitle')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>{t('forum.categories')}</Text>
          <View style={styles.categoryRow}>
            {categories.data?.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                selected={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </View>

          <Field
            label={t('forum.threadTitle')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('forum.threadTitlePlaceholder')}
            maxLength={240}
          />

          <Field
            label={t('forum.threadBody')}
            value={body}
            onChangeText={setBody}
            placeholder={t('forum.threadBodyPlaceholder')}
            multiline
            style={styles.bodyInput}
            maxLength={8000}
            hint={t('forum.guidelines')}
          />

          {error ? <ErrorNote message={error} style={styles.error} /> : null}

          <PillButton
            label={t('forum.post')}
            onPress={() => create.mutate()}
            disabled={!valid}
            loading={create.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.xl,
  },
  label: {
    ...type.label,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  bodyInput: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  error: {
    marginBottom: spacing.lg,
  },
});
