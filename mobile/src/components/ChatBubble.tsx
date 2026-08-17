import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { colors, fonts, radius, shadow, spacing, type } from '@/theme/tokens';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  authorName?: string;
  avatarUri?: string;
  /** Renders the three-dot rest state while the first token is in flight. */
  pending?: boolean;
}

/**
 * User turns sit right with a small avatar above; assistant turns sit left
 * behind the ✦ sparkle chip — matching the shot's chat screen.
 */
export function ChatBubble({ role, content, authorName = '', avatarUri, pending }: Props) {
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {isUser ? null : (
        <View style={styles.sparkle}>
          <Ionicons name="sparkles" size={13} color={colors.taupe} />
        </View>
      )}

      <View style={styles.bubbleWrap}>
        <View
          style={[
            styles.bubble,
            shadow.subtle,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {pending ? (
            <TypingDots />
          ) : (
            <Markdownish text={content} />
          )}
        </View>
      </View>

      {isUser ? (
        <View style={styles.avatar}>
          <Avatar uri={avatarUri} name={authorName || 'You'} size={28} ring />
        </View>
      ) : null}
    </View>
  );
}

function TypingDots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, i === 1 && styles.dotMid]} />
      ))}
    </View>
  );
}

/**
 * The model writes light markdown. Rather than pull in a renderer, handle the
 * two things it actually uses: **bold** spans and `-`/`*` bullet lines.
 */
function Markdownish({ text }: { text: string }) {
  const lines = text.split('\n').filter((line, i, all) => line.trim() || all[i - 1]?.trim());

  return (
    <View style={styles.content}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        const isBullet = /^[-*•]\s+/.test(trimmed);
        const body = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : trimmed;
        if (!body) return null;

        return (
          <View key={index} style={isBullet ? styles.bulletRow : undefined}>
            {isBullet ? <Text style={styles.bulletDot}>•</Text> : null}
            <Text style={[type.body, isBullet && styles.bulletText]}>
              {renderBold(body)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function renderBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  rowUser: {
    justifyContent: 'flex-end',
    paddingLeft: 36,
  },
  rowAssistant: {
    justifyContent: 'flex-start',
    paddingRight: 24,
  },
  bubbleWrap: {
    flexShrink: 1,
  },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.bubble,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  bubbleUser: {
    borderTopRightRadius: 6,
  },
  bubbleAssistant: {
    borderTopLeftRadius: 6,
  },
  content: {
    gap: 7,
  },
  bold: {
    fontFamily: fonts.bold,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 7,
  },
  bulletDot: {
    ...type.body,
    color: colors.subtle,
    lineHeight: 23,
  },
  bulletText: {
    flex: 1,
  },
  sparkle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatar: {
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tan,
  },
  dotMid: {
    opacity: 0.6,
  },
});
