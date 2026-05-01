import type { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Fitmedia type system.
 * All sizes, weights, and tracking are baked in.
 *
 * Usage:
 *   <Text style={typography.heading}>Today's Session</Text>
 *
 * NOTE: This depends on Inter being loaded via expo-font.
 * See src/theme/fonts.ts for the loader hook.
 */

// React Native uses font files per weight rather than fontWeight strings on Android.
// We map weights to the loaded font family names.
const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  displayXl: {
    fontFamily: fontFamily.bold,
    fontSize: 36,
    letterSpacing: -0.6,
    lineHeight: 41, // ~1.15
    color: colors.ink1,
  } satisfies TextStyle,

  display: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    letterSpacing: -0.4,
    lineHeight: 32,
    color: colors.ink1,
  } satisfies TextStyle,

  heading: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    letterSpacing: -0.2,
    lineHeight: 24,
    color: colors.ink1,
  } satisfies TextStyle,

  subheading: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    letterSpacing: -0.1,
    lineHeight: 22,
    color: colors.ink1,
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 21, // ~1.4
    color: colors.ink1,
  } satisfies TextStyle,

  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 21,
    color: colors.ink1,
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    letterSpacing: 0.1,
    lineHeight: 18,
    color: colors.ink2,
  } satisfies TextStyle,

  label: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.6,
    lineHeight: 14,
    textTransform: 'uppercase',
    color: colors.ink3,
  } satisfies TextStyle,
} as const;

/**
 * Apply this to any Text component containing numbers (timers, weights, reps,
 * calorie counts, set counts) so digits don't jiggle when they change.
 *
 * Usage:
 *   <Text style={[typography.displayXl, numericStyle]}>{seconds}</Text>
 */
export const numericStyle: TextStyle = {
  fontVariant: ['tabular-nums'],
};

export type TypographyToken = keyof typeof typography;
