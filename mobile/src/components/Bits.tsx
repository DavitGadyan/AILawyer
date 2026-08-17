import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing, type } from '@/theme/tokens';

/** Persistent "AI guidance, not legal advice" marker shown on AI surfaces. */
export function DisclaimerChip({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.disclaimer, style]}>
      <Ionicons name="information-circle-outline" size={13} color={colors.subtle} />
      <Text style={styles.disclaimerText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  style,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={22} color={colors.subtle} />
      </View>
      <Text style={type.h2}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function Loading({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.loading, style]}>
      <ActivityIndicator color={colors.taupe} />
    </View>
  );
}

export function ErrorNote({ message, style }: { message: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.error, style]}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

/** Labelled text input used across auth and the forum composer. */
export function Field({ label, hint, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.subtle}
        {...props}
        style={[styles.input, style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Key/value row used on the analysis and lawyer-profile screens. */
export function DetailRow({
  label,
  value,
  lines = 2,
}: {
  label: string;
  value: string;
  /** Structuring answers ("where revenue is collected") run longer than a nationality. */
  lines?: number;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={lines}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'center',
  },
  disclaimerText: {
    ...type.caption,
    fontSize: 11.5,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...type.bodyMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.cardSm,
    backgroundColor: '#FDECEC',
  },
  errorText: {
    ...type.caption,
    color: colors.danger,
    flex: 1,
  },
  field: {
    gap: 6,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...type.label,
  },
  input: {
    ...type.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardSm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.ink,
    outlineStyle: 'none' as never,
  },
  hint: {
    ...type.caption,
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: 9,
  },
  detailLabel: {
    ...type.caption,
  },
  detailValue: {
    ...type.captionStrong,
    color: colors.ink,
    fontSize: 13.5,
    flex: 1,
    textAlign: 'right',
  },
});
