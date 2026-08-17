import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { DetailRow, ErrorNote, Loading } from '@/components/Bits';
import { Card, SectionHeader } from '@/components/Card';
import { Tag } from '@/components/Chip';
import { currencySymbol } from '@/components/LawyerCard';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import {
  colors,
  PHONE_MAX_WIDTH,
  radius,
  shadow,
  spacing,
  type,
} from '@/theme/tokens';

const specialtyLabel = (slug: string) =>
  slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function LawyerScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lawyerId = Number(id);

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const lawyer = useQuery({
    queryKey: ['lawyer', lawyerId],
    queryFn: () => api.lawyer(lawyerId),
    enabled: Number.isFinite(lawyerId),
  });

  const contact = async (channel: 'whatsapp' | 'email') => {
    setError('');
    try {
      const result = await api.requestConsultation({ lawyer_id: lawyerId, channel });
      const url = channel === 'whatsapp' ? result.whatsapp_url : result.mailto_url;
      if (!url) {
        setError(t('common.error'));
        return;
      }
      await Linking.openURL(url);
      setBooking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  if (lawyer.isLoading) {
    return (
      <Screen>
        <AppHeader />
        <Loading />
      </Screen>
    );
  }

  if (lawyer.isError || !lawyer.data) {
    return (
      <Screen>
        <AppHeader />
        <ErrorNote message={t('common.error')} style={styles.pad} />
      </Screen>
    );
  }

  const data = lawyer.data;

  return (
    <Screen>
      <AppHeader rightIcon="bookmark-outline" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar uri={data.avatar_url} name={data.name} size={88} />
          <Text style={[type.h1, styles.name]}>{data.name}</Text>
          <Text style={type.bodyMuted}>{data.headline}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.subtle} />
            <Text style={type.caption}>
              {data.city}, {data.country}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Stat
              icon="star"
              value={data.rating.toFixed(1)}
              caption={`(${data.reviews_count})`}
              tint={colors.star}
            />
            <View style={styles.statDivider} />
            <Stat
              icon="briefcase-outline"
              value={String(data.years_experience)}
              caption={t('lawyers.experienceLabel')}
            />
            <View style={styles.statDivider} />
            <Stat
              icon="folder-outline"
              value={String(data.cases_count)}
              caption={t('lawyers.casesLabel')}
            />
          </View>

          <Text style={styles.price}>
            {currencySymbol(data.currency)}
            {data.hourly_rate}
            <Text style={styles.priceUnit}>{t('lawyers.perHour')}</Text>
          </Text>

          {data.offers_free_consult ? (
            <View style={styles.freeBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.freeText}>{t('lawyers.freeConsult')}</Text>
            </View>
          ) : null}
        </View>

        <SectionHeader title={t('lawyers.about')} style={styles.section} />
        <Card style={styles.card}>
          <Text style={type.body}>{data.bio}</Text>
        </Card>

        <SectionHeader title={t('lawyers.focus')} style={styles.section} />
        <View style={styles.tagRow}>
          {data.specialties.map((slug) => (
            <Tag key={slug} label={specialtyLabel(slug)} />
          ))}
        </View>

        <Card style={[styles.cardTight, styles.section]}>
          <DetailRow label={t('lawyers.admittedIn')} value={data.bar_admission} />
          <View style={styles.hairline} />
          <DetailRow
            label={t('lawyers.speaks')}
            value={data.languages.map((l) => (l === 'es' ? 'Español' : 'English')).join(', ')}
          />
          {data.firm ? (
            <>
              <View style={styles.hairline} />
              <DetailRow label="Firm" value={data.firm.name} />
            </>
          ) : null}
        </Card>

        {error ? <ErrorNote message={error} style={styles.section} /> : null}

        <PillButton
          label={t('lawyers.book')}
          onPress={() => setBooking(true)}
          style={styles.cta}
        />
      </ScrollView>

      <Modal visible={booking} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setBooking(false)}>
          <Pressable style={[styles.sheet, shadow.soft]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={type.h1}>{t('lawyers.bookingSheetTitle')}</Text>
            <Text style={type.bodyMuted}>{t('lawyers.bookingSheetBody')}</Text>

            <View style={styles.channelRow}>
              <ChannelButton
                icon="logo-whatsapp"
                label={t('lawyers.whatsapp')}
                onPress={() => contact('whatsapp')}
                disabled={!data.whatsapp}
              />
              <ChannelButton
                icon="mail-outline"
                label={t('lawyers.email')}
                onPress={() => contact('email')}
                disabled={!data.email}
              />
            </View>

            <PillButton
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => setBooking(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Stat({
  icon,
  value,
  caption,
  tint,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  caption: string;
  tint?: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <Ionicons name={icon} size={14} color={tint ?? colors.taupe} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statCaption} numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}

function ChannelButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.channel,
        pressed && styles.pressed,
        disabled && styles.channelDisabled,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.ink} />
      <Text style={styles.channelLabel}>{label}</Text>
    </Pressable>
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
  hero: {
    alignItems: 'center',
    gap: 5,
    paddingBottom: spacing.lg,
  },
  name: {
    marginTop: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.cardSm,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...type.h2,
    fontSize: 16,
  },
  statCaption: {
    ...type.caption,
    fontSize: 11.5,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.borderSoft,
  },
  price: {
    ...type.h1,
    marginTop: spacing.lg,
  },
  priceUnit: {
    ...type.caption,
    fontSize: 14,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: '#EDF7F1',
    marginTop: 4,
  },
  freeText: {
    ...type.captionStrong,
    fontSize: 12.5,
    color: colors.success,
  },
  section: {
    marginTop: spacing.xxl,
  },
  card: {
    padding: spacing.lg,
  },
  cardTight: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cta: {
    marginTop: spacing.xxl,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 8, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: PHONE_MAX_WIDTH,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  channelRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  channel: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
    borderRadius: radius.cardSm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  channelDisabled: {
    opacity: 0.4,
  },
  channelLabel: {
    ...type.captionStrong,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.8,
  },
});
