import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { CaseProfile } from '@/api/types';
import { AppHeader } from '@/components/AppHeader';
import { DetailRow, ErrorNote, Loading } from '@/components/Bits';
import { Card, SectionHeader } from '@/components/Card';
import { Tag } from '@/components/Chip';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing, type } from '@/theme/tokens';

export default function CaseScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileId = Number(id);
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ['case', profileId],
    queryFn: () => api.caseProfile(profileId),
    enabled: Number.isFinite(profileId),
  });

  const toggle = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: number; isDone: boolean }) =>
      api.toggleChecklistItem(itemId, isDone),
    // Optimistic: the checkbox should respond instantly, not after a round-trip.
    onMutate: async ({ itemId, isDone }) => {
      await queryClient.cancelQueries({ queryKey: ['case', profileId] });
      const previous = queryClient.getQueryData<CaseProfile>(['case', profileId]);
      queryClient.setQueryData<CaseProfile>(['case', profileId], (old) =>
        old
          ? {
              ...old,
              checklist: old.checklist.map((item) =>
                item.id === itemId ? { ...item, is_done: isDone } : item,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['case', profileId], context.previous);
      }
    },
  });

  if (profile.isLoading) {
    return (
      <Screen>
        <AppHeader title={t('case.title')} />
        <Loading />
      </Screen>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <Screen>
        <AppHeader title={t('case.title')} />
        <ErrorNote message={t('common.error')} style={styles.pad} />
      </Screen>
    );
  }

  const data = profile.data;
  const done = data.checklist.filter((item) => item.is_done).length;

  return (
    <Screen>
      <AppHeader title={t('case.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {data.red_flags.length > 0 ? (
          <Card style={styles.flags}>
            <View style={styles.flagHeader}>
              <Ionicons name="warning-outline" size={17} color={colors.danger} />
              <Text style={styles.flagTitle}>{t('case.redFlags')}</Text>
            </View>
            {data.red_flags.map((flag) => (
              <Text key={flag} style={styles.flagText}>
                • {flag}
              </Text>
            ))}
          </Card>
        ) : null}

        <SectionHeader title={t('case.summary')} />
        <Card style={styles.card}>
          <Text style={type.body}>{data.summary || data.goal}</Text>
        </Card>

        <SectionHeader title={t('case.profile')} style={styles.section} />
        <Card style={styles.cardTight}>
          <DetailRow label={t('case.nationality')} value={data.nationality} />
          <View style={styles.hairline} />
          <DetailRow label={t('case.currentCountry')} value={data.current_country} />
          <View style={styles.hairline} />
          <DetailRow label={t('case.status')} value={data.current_status} />
          <View style={styles.hairline} />
          <DetailRow label={t('case.target')} value={data.target_jurisdiction} />
          <View style={styles.hairline} />
          <DetailRow
            label={t('case.urgency')}
            value={t(`case.urgencyLevel.${data.urgency}`)}
          />
          <View style={styles.hairline} />
          <DetailRow label={t('case.dependents')} value={String(data.dependents)} />
        </Card>

        {data.key_facts.length > 0 ? (
          <>
            <SectionHeader title={t('case.keyFacts')} style={styles.section} />
            <Card style={styles.card}>
              {data.key_facts.map((fact) => (
                <View key={fact} style={styles.factRow}>
                  <Ionicons name="ellipse" size={5} color={colors.tan} style={styles.bullet} />
                  <Text style={styles.factText}>{fact}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SectionHeader title={t('case.routes')} style={styles.section} />
        {data.recommended_routes.map((route) => (
          <Card key={route.name} style={styles.route}>
            <View style={styles.routeHeader}>
              <Text style={type.h2} numberOfLines={2}>
                {route.name}
              </Text>
              <Tag label={t('case.fit', { score: route.fit_score })} />
            </View>
            <Text style={type.bodyMuted}>{route.why}</Text>
            <View style={styles.routeMeta}>
              <View style={styles.routeMetaItem}>
                <Ionicons name="time-outline" size={14} color={colors.subtle} />
                <Text style={styles.routeMetaText}>{route.typical_timeline}</Text>
              </View>
              <View style={styles.routeMetaItem}>
                <Ionicons name="pricetag-outline" size={14} color={colors.subtle} />
                <Text style={styles.routeMetaText}>{route.est_cost}</Text>
              </View>
            </View>
          </Card>
        ))}

        <SectionHeader
          title={t('case.checklist')}
          actionLabel={t('case.checklistProgress', {
            done,
            total: data.checklist.length,
          })}
          style={styles.section}
        />
        <Card style={styles.cardTight}>
          {data.checklist.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.hairline} /> : null}
              <Pressable
                onPress={() => toggle.mutate({ itemId: item.id, isDone: !item.is_done })}
                style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
              >
                <View style={[styles.checkbox, item.is_done && styles.checkboxOn]}>
                  {item.is_done ? (
                    <Ionicons name="checkmark" size={13} color={colors.white} />
                  ) : null}
                </View>
                <View style={styles.checkText}>
                  <Text style={[type.title, item.is_done && styles.struck]}>{item.name}</Text>
                  <Text style={type.caption}>{item.why}</Text>
                </View>
                <Tag
                  label={item.mandatory ? t('case.required') : t('case.supporting')}
                />
              </Pressable>
            </View>
          ))}
        </Card>

        <PillButton
          label={t('case.findLawyers')}
          icon="arrow-forward"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/lawyers',
              params: { jurisdiction: data.target_jurisdiction },
            })
          }
          style={styles.cta}
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
  pad: {
    margin: spacing.xl,
  },
  section: {
    marginTop: spacing.xxl,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTight: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  flags: {
    padding: spacing.lg,
    gap: 6,
    borderColor: '#F3D4D4',
    backgroundColor: '#FDF6F6',
    marginBottom: spacing.xl,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  flagTitle: {
    ...type.captionStrong,
    color: colors.danger,
  },
  flagText: {
    ...type.bodyMuted,
    fontSize: 13.5,
    color: colors.taupe,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    marginTop: 8,
  },
  factText: {
    ...type.bodyMuted,
    flex: 1,
  },
  route: {
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  routeMeta: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  routeMetaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    // Timelines and cost ranges run long; let them wrap inside the card.
    flexBasis: '100%',
  },
  routeMetaText: {
    ...type.caption,
    fontSize: 12.5,
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  checkText: {
    flex: 1,
    gap: 1,
  },
  struck: {
    textDecorationLine: 'line-through',
    color: colors.subtle,
  },
  pressed: {
    opacity: 0.7,
  },
  cta: {
    marginTop: spacing.xxl,
  },
});
