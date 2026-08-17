import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '@/api/client';
import type { Practice } from '@/api/types';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, Loading } from '@/components/Bits';
import { Chip } from '@/components/Chip';
import { LawyerCard } from '@/components/LawyerCard';
import { Screen } from '@/components/Screen';
import { useApp } from '@/store/app-context';
import { colors, radius, spacing, type } from '@/theme/tokens';

const SPECIALTIES: Record<Practice, readonly string[]> = {
  immigration: [
    'work_visa',
    'student_visa',
    'family_reunification',
    'asylum',
    'citizenship',
    'golden_visa',
    'digital_nomad',
    'deportation_defense',
    'appeals',
    'permanent_residency',
    'investor_visa',
    'business_immigration',
  ],
  tax: [
    'corporate_structuring',
    'cross_border_tax',
    'us_uk_tax',
    'transfer_pricing',
    'permanent_establishment',
    'vat_sales_tax',
    'rd_credits',
    'crypto_tax',
    'exit_planning',
    'personal_tax',
  ],
};

/** Slugs whose title-cased form reads badly (acronyms, hyphenation). */
const LABEL_OVERRIDES: Record<string, string> = {
  us_uk_tax: 'US–UK Tax',
  cross_border_tax: 'Cross-Border Tax',
  vat_sales_tax: 'VAT & Sales Tax',
  rd_credits: 'R&D Credits',
};

const label = (slug: string) =>
  LABEL_OVERRIDES[slug] ??
  slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function LawyersScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ practice?: string; jurisdiction?: string }>();
  const { practice: appPractice } = useApp();

  // A deep link from a case/structure screen pins the practice it came from.
  const practice = (params.practice as Practice) ?? appPractice;
  const isTax = practice === 'tax';

  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState<string | undefined>(
    params.jurisdiction as string | undefined,
  );
  const [specialty, setSpecialty] = useState<string | undefined>();

  const lawyers = useQuery({
    queryKey: ['lawyers', practice, query, jurisdiction, specialty],
    queryFn: () =>
      api.lawyers({ q: query, practice, jurisdiction, specialty, limit: 100 }),
  });

  const hasFilters = Boolean(query || jurisdiction || specialty);

  return (
    <Screen>
      <AppHeader
        title={t(isTax ? 'lawyers.titleTax' : 'lawyers.title')}
        showBack={false}
      />

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={17} color={colors.subtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('lawyers.searchPlaceholder')}
          placeholderTextColor={colors.subtle}
          style={styles.search}
          returnKeyType="search"
        />
        {query ? (
          <Ionicons
            name="close-circle"
            size={17}
            color={colors.subtle}
            onPress={() => setQuery('')}
          />
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterStrip}
      >
        <Chip
          label={t('lawyers.allJurisdictions')}
          selected={!jurisdiction}
          onPress={() => setJurisdiction(undefined)}
        />
        <Chip
          label="🇺🇸 US"
          selected={jurisdiction === 'US'}
          onPress={() => setJurisdiction('US')}
        />
        <Chip
          label="🇪🇺 EU"
          selected={jurisdiction === 'EU'}
          onPress={() => setJurisdiction('EU')}
        />
        <Chip
          label="🇪🇸 ES"
          selected={jurisdiction === 'ES'}
          onPress={() => setJurisdiction('ES')}
        />
        <Chip
          label="🇬🇧 UK"
          selected={jurisdiction === 'UK'}
          onPress={() => setJurisdiction('UK')}
        />
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterStrip}
      >
        {SPECIALTIES[practice].map((slug) => (
          <Chip
            key={slug}
            label={label(slug)}
            selected={specialty === slug}
            onPress={() => setSpecialty(specialty === slug ? undefined : slug)}
          />
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {lawyers.isLoading ? (
          <Loading />
        ) : lawyers.data?.length ? (
          <>
            <Text style={styles.count}>
              {t(isTax ? 'lawyers.subtitleTax' : 'lawyers.subtitle', {
                count: lawyers.data.length,
              })}
            </Text>
            {lawyers.data.map((lawyer) => (
              <LawyerCard
                key={lawyer.id}
                lawyer={lawyer}
                onPress={() => router.push(`/lawyer/${lawyer.id}`)}
                style={styles.card}
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon="search-outline"
            title={t('lawyers.empty')}
            body={hasFilters ? t('lawyers.clearFilters') : undefined}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    ...type.body,
    flex: 1,
    color: colors.ink,
    outlineStyle: 'none' as never,
  },
  filterStrip: {
    // A horizontal ScrollView inside a flex column collapses to zero height on
    // web unless it is pinned; the chips are 38px tall.
    height: 38,
    flexGrow: 0,
    flexShrink: 0,
    marginTop: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  count: {
    ...type.caption,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
});
