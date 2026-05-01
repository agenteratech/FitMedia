/**
 * Fitmedia color tokens.
 * Locked palette — do NOT add raw hex values anywhere else in the app.
 * If you need a new color, add it here first.
 */
export const colors = {
  // Surfaces
  bg: '#F4F1EC',           // warm off-white app background
  surface: '#FFFFFF',       // cards, sheets, inputs
  surfaceSunk: '#EBE7E0',   // recessed elements, inactive segments
  surfaceElevBorder: '#E8E3DA', // 1px border on cards & elevated surfaces

  // Ink (text + primary fills)
  ink1: '#1B1815',  // primary text + primary action fills
  ink2: '#56524C',  // secondary text
  ink3: '#8E887F',  // tertiary text, placeholders
  ink4: '#BDB8AF',  // disabled, muted icons

  // Accent (use sparingly — eye magnet)
  accent: '#D9663F',
  accentSoft: '#F4DCC9',

  // Status
  success: '#4F7A5A',
  successSoft: '#DCE8DD',
  alert: '#A4513C',

  // Subtle dividers inside cards
  divider: '#F0EBE2',

  // Overlays
  scrim: 'rgba(20, 15, 10, 0.40)',
} as const;

export type ColorToken = keyof typeof colors;
