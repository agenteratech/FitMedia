/**
 * Fitmedia spacing scale (4px grid).
 * Always reference these tokens — never hardcode pixel values for spacing.
 *
 * Usage:
 *   padding: spacing.lg          // 16
 *   marginBottom: spacing['2xl'] // 24
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,    // standard card padding
  '2xl': 24, // screen edge padding, vertical rhythm between sections
  '3xl': 32, // large vertical rhythm
  '4xl': 48,
  '5xl': 64,
} as const;

export type SpacingToken = keyof typeof spacing;
