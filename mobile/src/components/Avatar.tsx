import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

interface Props {
  uri?: string;
  name: string;
  size?: number;
  ring?: boolean;
}

/** Circular avatar; falls back to initials when there is no image. */
export function Avatar({ uri, name, size = 44, ring = false }: Props) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.wrap, dimension, ring && styles.ring]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={dimension}
          contentFit="cover"
          transition={150}
          accessibilityLabel={name}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
  initials: {
    fontFamily: fonts.semibold,
    color: colors.taupe,
  },
});
