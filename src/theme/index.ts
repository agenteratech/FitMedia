/**
 * Single import point for the entire Fitmedia theme.
 *
 * Usage:
 *   import { colors, spacing, radius, typography, shadows, numericStyle } from '@/theme';
 */
export { colors } from './colors';
export type { ColorToken } from './colors';

export { spacing } from './spacing';
export type { SpacingToken } from './spacing';

export { radius } from './radius';
export type { RadiusToken } from './radius';

export { typography, numericStyle } from './typography';
export type { TypographyToken } from './typography';

export { shadows } from './shadows';
export type { ShadowToken } from './shadows';

export { useFitmediaFonts } from './fonts';
