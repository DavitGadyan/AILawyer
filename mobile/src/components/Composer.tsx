import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { useSpeech } from '@/hooks/useSpeech';
import { colors, radius, shadow, spacing, type } from '@/theme/tokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  speakLabel: string;
  locale: string;
  /** Left "+" affordance — opens the topic sheet on home, attachments elsewhere. */
  onPlus?: () => void;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  minHeight?: number;
}

/**
 * The floating composer from the shot: white rounded card, text on top, and a
 * bottom row of "+" · Speak · send.
 */
export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  speakLabel,
  locale,
  onPlus,
  disabled = false,
  busy = false,
  style,
  minHeight = 46,
}: Props) {
  const [focused, setFocused] = useState(false);
  const speech = useSpeech(locale, onChangeText);
  const canSend = value.trim().length > 0 && !disabled && !busy;

  return (
    <View style={[styles.wrap, shadow.soft, focused && styles.focused, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { minHeight }]}
        editable={!disabled}
        onSubmitEditing={() => canSend && onSend()}
        accessibilityLabel={placeholder}
      />

      <View style={styles.row}>
        <Pressable
          onPress={onPlus}
          disabled={!onPlus}
          accessibilityRole="button"
          accessibilityLabel="More"
          style={({ pressed }) => [
            styles.circle,
            styles.circleDark,
            !onPlus && styles.hiddenish,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>

        <View style={styles.spacer} />

        <Pressable
          onPress={speech.toggle}
          disabled={!speech.supported || disabled}
          accessibilityRole="button"
          accessibilityLabel={speakLabel}
          style={({ pressed }) => [
            styles.speak,
            speech.listening && styles.speakActive,
            !speech.supported && styles.speakDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={speech.listening ? 'mic' : 'mic-outline'}
            size={15}
            color={speech.supported ? colors.white : colors.subtle}
          />
          <Text style={[styles.speakLabel, !speech.supported && styles.speakLabelDisabled]}>
            {speakLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [
            styles.circle,
            styles.circleDark,
            !canSend && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={busy ? 'ellipsis-horizontal' : 'paper-plane'}
            size={17}
            color={colors.white}
            style={busy ? undefined : styles.sendIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.composer,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  focused: {
    borderColor: colors.tan,
  },
  input: {
    ...type.body,
    color: colors.ink,
    textAlignVertical: 'top',
    // Web focus rings clash with the custom border treatment.
    outlineStyle: 'none' as never,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDark: {
    backgroundColor: colors.ink,
  },
  sendIcon: {
    // The paper-plane glyph sits visually low-left inside its box.
    marginLeft: -1,
    marginTop: 1,
  },
  speak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.taupe,
  },
  speakActive: {
    backgroundColor: colors.danger,
  },
  speakDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  speakLabel: {
    ...type.captionStrong,
    color: colors.white,
    fontSize: 13,
  },
  speakLabelDisabled: {
    color: colors.subtle,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.35,
  },
  hiddenish: {
    opacity: 0,
  },
});
