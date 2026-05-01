/**
 * Fitmedia curvature scale.
 * Every component is curvy — when in doubt, round more.
 *
 * Usage:
 *   borderRadius: radius.card       // 20
 *   borderRadius: radius.pill       // 999 (fully rounded)
 *   borderTopLeftRadius: radius.sheet // 28 (sheets only round the top)
 */
export const radius = {
  input: 16,
  buttonCompact: 14,
  button: 18,
  card: 20,
  modal: 24,
  sheet: 28,        // sheet TOP corners only; bottom uses 12
  sheetBottom: 12,  // small radius on sheet bottom corners
  timer: 32,        // floating timer island
  pill: 999,        // chips, snack bar, day pills, avatars
} as const;

export type RadiusToken = keyof typeof radius;
