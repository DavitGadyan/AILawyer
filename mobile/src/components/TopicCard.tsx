import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, IconChip } from '@/components/Card';
import { spacing, type } from '@/theme/tokens';

/** Maps the admin-editable icon slug to a concrete glyph. */
const ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  briefcase: 'briefcase-outline',
  school: 'school-outline',
  people: 'people-outline',
  home: 'home-outline',
  laptop: 'laptop-outline',
  time: 'time-outline',
  card: 'card-outline',
  globe: 'globe-outline',
  shield: 'shield-checkmark-outline',
  alert: 'alert-circle-outline',
  'document-text': 'document-text-outline',
  flag: 'flag-outline',
  sunny: 'sunny-outline',
  chatbubbles: 'chatbubbles-outline',
  // tax & structuring
  business: 'business-outline',
  cash: 'cash-outline',
  calculator: 'calculator-outline',
  'git-network': 'git-network-outline',
  layers: 'layers-outline',
  receipt: 'receipt-outline',
  swap: 'swap-horizontal-outline',
  'trending-up': 'trending-up-outline',
};

export function topicIcon(slug: string) {
  return ICONS[slug] ?? 'document-text-outline';
}

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

/** Icon chip + semibold title + muted subtitle — the "Suggested Topics" card. */
export function TopicCard({ icon, title, subtitle, onPress }: Props) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <IconChip name={topicIcon(icon)} />
      <View style={styles.text}>
        <Text style={type.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    ...type.caption,
  },
});
