import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { colors } from '@/theme/tokens';

/**
 * Splash-screen hero: scales of justice over a warm halo.
 *
 * The reference shot uses a marble Lady Justice render, which is the designer's
 * own asset. This is an original mark drawn in the same warm monochrome palette.
 * To use a photograph instead, drop one at `assets/images/justice.png` and swap
 * this component for an <Image>.
 */
export function JusticeHero({ size = 300 }: { size?: number }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 300 300">
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="46%" r="52%">
            <Stop offset="0%" stopColor={colors.tan} stopOpacity="0.55" />
            <Stop offset="55%" stopColor={colors.tan} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={colors.canvas} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Soft halo behind the mark */}
        <Circle cx="150" cy="138" r="140" fill="url(#halo)" />
        <Circle
          cx="150"
          cy="138"
          r="96"
          stroke={colors.tan}
          strokeOpacity="0.4"
          strokeWidth="1"
          fill="none"
        />
        <Circle
          cx="150"
          cy="138"
          r="122"
          stroke={colors.tan}
          strokeOpacity="0.22"
          strokeWidth="1"
          fill="none"
        />

        <G
          stroke={colors.taupe}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Central column and base */}
          <Path d="M150 62 L150 214" />
          <Path d="M116 214 L184 214" />
          <Path d="M124 228 L176 228" />
          <Path d="M116 214 Q150 200 184 214" />

          {/* Cross beam */}
          <Path d="M70 92 L230 92" />

          {/* Suspension cords */}
          <Path d="M70 92 L70 112" strokeWidth="2.5" />
          <Path d="M230 92 L230 112" strokeWidth="2.5" />
          <Path d="M70 112 L44 138" strokeWidth="2" />
          <Path d="M70 112 L96 138" strokeWidth="2" />
          <Path d="M230 112 L204 138" strokeWidth="2" />
          <Path d="M230 112 L256 138" strokeWidth="2" />

          {/* Pans */}
          <Path d="M40 138 Q70 176 100 138" fill={colors.surface} fillOpacity="0.9" />
          <Path d="M200 138 Q230 176 260 138" fill={colors.surface} fillOpacity="0.9" />
        </G>

        {/* Finial */}
        <Circle cx="150" cy="56" r="9" fill={colors.taupe} />
        <Circle cx="150" cy="56" r="3.5" fill={colors.surface} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
