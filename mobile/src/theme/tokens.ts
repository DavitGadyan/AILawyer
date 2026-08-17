/**
 * Design tokens extracted from the reference shot:
 * https://dribbble.com/shots/27558038-AI-Lawyer-Matching-App-UI
 *
 * Single source of truth — no component should hard-code a colour or radius.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  /** App background — the light warm grey the phones sit on. */
  canvas: '#EFEFEE',
  /** Cards, bubbles, the composer. */
  surface: '#FFFFFF',
  /** Icon chips and muted rows. */
  surfaceAlt: '#F6F5F4',
  /** Primary text and the black pill CTAs. */
  ink: '#0A0808',
  /** Secondary text. */
  inkMuted: '#605954',
  /** Tertiary text and placeholders. */
  subtle: '#937E6D',
  /** Warm accent — active chips, highlights. */
  tan: '#CBB9A8',
  /** Deep warm accent. */
  taupe: '#4B3E34',
  /** Hairlines and card outlines. */
  border: '#E3E4E4',
  /** A touch lighter, for dividers inside cards. */
  borderSoft: '#EFEDEB',
  star: '#F5B301',
  danger: '#E5484D',
  success: '#3E9B6B',
  white: '#FFFFFF',
} as const;

export const radius = {
  chip: 999,
  pill: 999,
  icon: 999,
  card: 24,
  cardSm: 20,
  sheet: 32,
  composer: 28,
  bubble: 22,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/**
 * The shot uses exactly one shadow: soft, diffuse, barely there. Reusing it
 * everywhere is what makes the surfaces feel like one system.
 */
export const shadow = {
  soft: Platform.select({
    ios: {
      shadowColor: '#0A0808',
      shadowOpacity: 0.06,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 3 },
    default: { boxShadow: '0 8px 24px rgba(10, 8, 8, 0.06)' },
  }) as ViewStyle,
  /** Slightly tighter, for small floating elements like icon buttons. */
  subtle: Platform.select({
    ios: {
      shadowColor: '#0A0808',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 4px 12px rgba(10, 8, 8, 0.05)' },
  }) as ViewStyle,
} as const;

/**
 * The shot's headlines mix weights on one line — regular for the lead-in,
 * extrabold for the payoff. `display` / `displayStrong` are that pair.
 */
export const type = {
  display: {
    fontFamily: fonts.regular,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
    letterSpacing: -0.6,
  } as TextStyle,
  displayStrong: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
    letterSpacing: -0.6,
  } as TextStyle,
  h1: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    lineHeight: 31,
    color: colors.ink,
    letterSpacing: -0.4,
  } as TextStyle,
  h2: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    letterSpacing: -0.2,
  } as TextStyle,
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  } as TextStyle,
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink,
  } as TextStyle,
  bodyMuted: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMuted,
  } as TextStyle,
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtle,
  } as TextStyle,
  captionStrong: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  } as TextStyle,
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkMuted,
  } as TextStyle,
  button: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.white,
  } as TextStyle,
} as const;

/** Phone-width column so the web build reads as the app, not a stretched page. */
export const PHONE_MAX_WIDTH = 480;

export const jurisdictions = [
  { code: 'US', flag: '🇺🇸', labelKey: 'jurisdiction.us' },
  { code: 'EU', flag: '🇪🇺', labelKey: 'jurisdiction.eu' },
  { code: 'ES', flag: '🇪🇸', labelKey: 'jurisdiction.es' },
  { code: 'UK', flag: '🇬🇧', labelKey: 'jurisdiction.uk' },
] as const;

export type JurisdictionCode = (typeof jurisdictions)[number]['code'];

export const practices = [
  { code: 'immigration', labelKey: 'practice.immigration', icon: 'airplane-outline' },
  { code: 'tax', labelKey: 'practice.tax', icon: 'business-outline' },
] as const;

export type PracticeCode = (typeof practices)[number]['code'];

/**
 * Which jurisdictions each practice offers, and in which order.
 * Immigration leads with the US; structuring questions almost always start from the
 * founder's own country, so tax leads with the UK.
 */
export const jurisdictionsFor: Record<PracticeCode, readonly JurisdictionCode[]> = {
  immigration: ['US', 'EU', 'ES', 'UK'],
  tax: ['UK', 'US', 'EU', 'ES'],
};

/** Entity-role tint for the structure diagram, drawn from the warm palette. */
export const entityRoleColors: Record<string, { fill: string; stroke: string }> = {
  holding: { fill: '#0A0808', stroke: '#0A0808' },
  trading: { fill: '#FFFFFF', stroke: '#CBB9A8' },
  ip: { fill: '#F6F5F4', stroke: '#937E6D' },
  finance: { fill: '#F6F5F4', stroke: '#937E6D' },
  dormant: { fill: '#F6F5F4', stroke: '#E3E4E4' },
};

export const severityColors: Record<string, { bg: string; fg: string }> = {
  high: { bg: '#FDECEC', fg: '#E5484D' },
  medium: { bg: '#FDF4E7', fg: '#B4761C' },
  low: { bg: '#EDF7F1', fg: '#3E9B6B' },
};
