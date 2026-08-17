import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Tag } from '@/components/Chip';
import { PillButton } from '@/components/PillButton';
import type { Lawyer, LawyerMatch } from '@/api/types';
import { colors, spacing, type } from '@/theme/tokens';

const CURRENCY: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };

export function currencySymbol(code: string): string {
  return CURRENCY[code] ?? `${code} `;
}

interface Props {
  lawyer: Lawyer | LawyerMatch;
  onPress: () => void;
  onBook?: () => void;
  /** 'carousel' is the fixed-width card that scrolls inline in chat. */
  variant?: 'list' | 'carousel';
  style?: StyleProp<ViewStyle>;
}

export function LawyerCard({ lawyer, onPress, onBook, variant = 'list', style }: Props) {
  const { t } = useTranslation();
  const match = 'match_score' in lawyer ? (lawyer as LawyerMatch) : null;

  return (
    <Card
      onPress={onPress}
      style={[styles.card, variant === 'carousel' && styles.carousel, style]}
    >
      <View style={styles.top}>
        <Avatar uri={lawyer.avatar_url} name={lawyer.name} size={46} />
        <View style={styles.identity}>
          <Text style={type.title} numberOfLines={1}>
            {lawyer.name}
          </Text>
          <Text style={styles.headline} numberOfLines={1}>
            {lawyer.headline}
          </Text>
        </View>
        <Text style={styles.price}>
          {currencySymbol(lawyer.currency)}
          {lawyer.hourly_rate}
          <Text style={styles.priceUnit}>{t('lawyers.perHour')}</Text>
        </Text>
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={colors.subtle} />
        <Text style={styles.location} numberOfLines={1}>
          {lawyer.city}, {lawyer.country}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.rating}>
          <Ionicons name="star" size={14} color={colors.star} />
          <Text style={styles.ratingValue}>
            {lawyer.rating.toFixed(1)}{' '}
            <Text style={styles.ratingCount}>({lawyer.reviews_count})</Text>
          </Text>
        </View>
        <Tag label={t('lawyers.yearsExp', { count: lawyer.years_experience })} />
        <Tag label={t('lawyers.cases', { count: lawyer.cases_count })} />
      </View>

      {match && match.match_reasons.length > 0 ? (
        <View style={styles.reasons}>
          {match.match_reasons.slice(0, 2).map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={styles.reasonText} numberOfLines={1}>
                {reason}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <PillButton
        label={t('lawyers.book')}
        onPress={onBook ?? onPress}
        size="sm"
        style={styles.cta}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 10,
  },
  carousel: {
    width: 290,
    marginRight: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    gap: 1,
  },
  headline: {
    ...type.caption,
  },
  price: {
    ...type.h2,
    fontSize: 17,
  },
  priceUnit: {
    ...type.caption,
    fontSize: 13,
    color: colors.subtle,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    ...type.caption,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    ...type.captionStrong,
    fontSize: 13.5,
    color: colors.ink,
  },
  ratingCount: {
    ...type.caption,
    color: colors.subtle,
  },
  reasons: {
    gap: 4,
    paddingTop: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    ...type.caption,
    flex: 1,
    color: colors.inkMuted,
  },
  cta: {
    marginTop: 2,
    alignSelf: 'stretch',
  },
});
