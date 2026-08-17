import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { TaxProfile } from '@/api/types';
import { AppHeader } from '@/components/AppHeader';
import { DetailRow, ErrorNote, Loading } from '@/components/Bits';
import { Card, SectionHeader } from '@/components/Card';
import { Tag } from '@/components/Chip';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { StructureDiagram } from '@/components/StructureDiagram';
import { colors, severityColors, spacing, type } from '@/theme/tokens';

export default function StructureScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileId = Number(id);
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ['tax', profileId],
    queryFn: () => api.taxProfile(profileId),
    enabled: Number.isFinite(profileId),
  });

  const toggle = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: number; isDone: boolean }) =>
      api.toggleComplianceItem(itemId, isDone),
    // Optimistic, same as the immigration checklist — the tick must feel instant.
    onMutate: async ({ itemId, isDone }) => {
      await queryClient.cancelQueries({ queryKey: ['tax', profileId] });
      const previous = queryClient.getQueryData<TaxProfile>(['tax', profileId]);
      queryClient.setQueryData<TaxProfile>(['tax', profileId], (old) =>
        old
          ? {
              ...old,
              compliance: old.compliance.map((item) =>
                item.id === itemId ? { ...item, is_done: isDone } : item,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tax', profileId], context.previous);
      }
    },
  });

  if (profile.isLoading) {
    return (
      <Screen>
        <AppHeader title={t('tax.title')} />
        <Loading />
      </Screen>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <Screen>
        <AppHeader title={t('tax.title')} />
        <ErrorNote message={t('common.error')} style={styles.pad} />
      </Screen>
    );
  }

  const data = profile.data;
  const done = data.compliance.filter((item) => item.is_done).length;

  return (
    <Screen>
      <AppHeader title={t('tax.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {data.red_flags.length > 0 ? (
          <Card style={styles.flags}>
            <View style={styles.flagHeader}>
              <Ionicons name="warning-outline" size={17} color={colors.danger} />
              <Text style={styles.flagTitle}>{t('tax.redFlags')}</Text>
            </View>
            {data.red_flags.map((flag) => (
              <Text key={flag} style={styles.flagText}>
                • {flag}
              </Text>
            ))}
          </Card>
        ) : null}

        <SectionHeader
          title={t('tax.summary')}
          actionLabel={t(`tax.level.${data.complexity}`)}
        />
        <Card style={styles.card}>
          <Text style={type.body}>{data.summary || data.goal}</Text>
        </Card>

        <SectionHeader title={t('tax.situation')} style={styles.section} />
        <Card style={styles.cardTight}>
          <DetailRow label={t('tax.residence')} value={data.residence_country} />
          <View style={styles.hairline} />
          <DetailRow
            label={t('tax.primaryJurisdiction')}
            value={data.primary_jurisdiction}
          />
          <View style={styles.hairline} />
          <DetailRow label={t('tax.activity')} value={data.business_activity} lines={3} />
          <View style={styles.hairline} />
          <DetailRow label={t('tax.revenueFlow')} value={data.revenue_flow} lines={4} />
          {data.current_entities.length > 0 ? (
            <>
              <View style={styles.hairline} />
              <DetailRow
                label={t('tax.currentEntities')}
                value={data.current_entities.join(', ')}
              />
            </>
          ) : null}
        </Card>

        {data.key_facts.length > 0 ? (
          <>
            <SectionHeader title={t('tax.keyFacts')} style={styles.section} />
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

        {/* ------------------------- the diagram ------------------------- */}
        <SectionHeader title={t('tax.structure')} style={styles.section} />
        <Card style={styles.diagramCard}>
          <StructureDiagram entities={data.entities} />
        </Card>
        {data.structure_rationale ? (
          <Text style={styles.rationale}>{data.structure_rationale}</Text>
        ) : null}

        <SectionHeader title={t('tax.entities')} style={styles.section} />
        {data.entities.map((entity) => (
          <Card key={entity.id} style={styles.entity}>
            <View style={styles.entityHeader}>
              <View style={styles.entityTitle}>
                <Text style={type.h2} numberOfLines={1}>
                  {entity.name}
                </Text>
                <Text style={type.caption} numberOfLines={1}>
                  {entity.entity_type}
                </Text>
              </View>
              <Tag label={t(`tax.role.${entity.role}`)} />
            </View>

            <Text style={type.bodyMuted}>{entity.rationale}</Text>

            <View style={styles.entityMeta}>
              <Text style={styles.metaLabel}>{t('tax.ownedBy')}</Text>
              <Text style={styles.metaValue}>
                {entity.owned_by
                  ? `${entity.owned_by} · ${entity.ownership_pct}%`
                  : t('tax.topOfGroup')}
              </Text>
            </View>
            <View style={styles.entityMeta}>
              <Text style={styles.metaLabel}>{t('tax.taxTreatment')}</Text>
              <Text style={styles.metaValue}>{entity.tax_treatment}</Text>
            </View>

            <View style={styles.costRow}>
              <View style={styles.costItem}>
                <Ionicons name="rocket-outline" size={13} color={colors.subtle} />
                <Text style={styles.costText}>
                  {t('tax.setupCost')} {entity.setup_cost}
                </Text>
              </View>
              <View style={styles.costItem}>
                <Ionicons name="repeat-outline" size={13} color={colors.subtle} />
                <Text style={styles.costText}>
                  {t('tax.annualCost')} {entity.annual_cost}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* ------------------------ risk register ------------------------ */}
        {data.risks.length > 0 ? (
          <>
            <SectionHeader title={t('tax.risks')} style={styles.section} />
            {data.risks.map((risk) => {
              const tone = severityColors[risk.severity] ?? severityColors.medium;
              return (
                <Card key={risk.id} style={styles.risk}>
                  <View style={styles.riskHeader}>
                    <Text style={[type.title, styles.riskTitle]}>{risk.title}</Text>
                    <View style={[styles.severity, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.severityText, { color: tone.fg }]}>
                        {t(`tax.severity.${risk.severity}`)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.riskCategory}>
                    {t(`tax.category.${risk.category}`)}
                  </Text>
                  <Text style={type.bodyMuted}>{risk.explanation}</Text>
                  <View style={styles.mitigation}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                    <Text style={styles.mitigationText}>{risk.mitigation}</Text>
                  </View>
                </Card>
              );
            })}
          </>
        ) : null}

        {/* --------------------- filing obligations ---------------------- */}
        {data.compliance.length > 0 ? (
          <>
            <SectionHeader
              title={t('tax.compliance')}
              actionLabel={t('tax.complianceProgress', {
                done,
                total: data.compliance.length,
              })}
              style={styles.section}
            />
            <Card style={styles.cardTight}>
              {data.compliance.map((item, index) => (
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
                      <Text style={[type.title, item.is_done && styles.struck]}>
                        {item.name}
                      </Text>
                      <Text style={type.caption}>
                        {item.jurisdiction} · {item.frequency} · {item.deadline}
                      </Text>
                      <Text style={styles.checkWhy}>{item.why}</Text>
                    </View>
                    <Tag label={item.mandatory ? t('case.required') : t('case.supporting')} />
                  </Pressable>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* ---------------------------- costs ---------------------------- */}
        <SectionHeader title={t('tax.costs')} style={styles.section} />
        <Card style={styles.cardTight}>
          <DetailRow label={t('tax.totalSetup')} value={data.estimated_setup_cost} />
          <View style={styles.hairline} />
          <DetailRow label={t('tax.totalAnnual')} value={data.estimated_annual_cost} />
        </Card>

        {data.alternatives.length > 0 ? (
          <>
            <SectionHeader title={t('tax.alternatives')} style={styles.section} />
            {data.alternatives.map((alt) => (
              <Card key={alt.name} style={styles.card}>
                <Text style={type.h2}>{alt.name}</Text>
                <Text style={type.bodyMuted}>{alt.why}</Text>
                <View style={styles.mitigation}>
                  <Ionicons name="git-compare-outline" size={14} color={colors.subtle} />
                  <Text style={styles.tradeoffText}>{alt.tradeoff}</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        <PillButton
          label={t('tax.findAdvisers')}
          icon="arrow-forward"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/lawyers',
              params: { practice: 'tax', jurisdiction: data.primary_jurisdiction },
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
  pad: { margin: spacing.xl },
  section: { marginTop: spacing.xxl },
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  bullet: { marginTop: 8 },
  factText: {
    ...type.bodyMuted,
    flex: 1,
  },
  diagramCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  rationale: {
    ...type.bodyMuted,
    marginTop: spacing.md,
    paddingHorizontal: 2,
  },
  entity: {
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  entityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  entityTitle: {
    flex: 1,
    gap: 1,
  },
  entityMeta: {
    gap: 1,
  },
  metaLabel: {
    ...type.label,
    fontSize: 11,
  },
  metaValue: {
    ...type.bodyMuted,
    fontSize: 13.5,
  },
  costRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: 2,
  },
  costItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  costText: {
    ...type.caption,
    fontSize: 12.5,
  },
  risk: {
    padding: spacing.lg,
    gap: 7,
    marginBottom: spacing.md,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  riskTitle: {
    flex: 1,
  },
  severity: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  severityText: {
    ...type.label,
    fontSize: 11,
  },
  riskCategory: {
    ...type.caption,
    fontSize: 12,
    marginTop: -3,
  },
  mitigation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 2,
  },
  mitigationText: {
    ...type.caption,
    flex: 1,
    color: colors.taupe,
  },
  tradeoffText: {
    ...type.caption,
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
  checkWhy: {
    ...type.caption,
    fontSize: 12,
  },
  struck: {
    textDecorationLine: 'line-through',
    color: colors.subtle,
  },
  pressed: { opacity: 0.7 },
  cta: { marginTop: spacing.xxl },
});
