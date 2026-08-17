import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, PHONE_MAX_WIDTH } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  /** Which safe-area edges to inset. Chat/composer screens usually keep 'bottom'. */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  /** Screens with their own full-bleed art (the splash) opt out of the padding. */
  bare?: boolean;
}

/**
 * Every screen sits on the warm-grey canvas, constrained to a phone-width column
 * so the web build reads as the app rather than a stretched page.
 */
export function Screen({ children, edges = ['top'], style, bare = false }: Props) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.column} edges={edges}>
        <View style={[styles.inner, bare && styles.bare, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: PHONE_MAX_WIDTH,
  },
  inner: {
    flex: 1,
  },
  bare: {
    paddingHorizontal: 0,
  },
});
