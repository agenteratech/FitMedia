// KEEP: hooks/useBodyPartScores.ts exports colorForScore() using colors.green/orange/red.
// That hook is off-limits for modification (see AGENT_INSTRUCTIONS.md §0.3).
// Delete this file only after migrating useBodyPartScores to src/theme/colors.ts tokens.
export const colors = {
  background: '#0a0a0f',
  card: '#12121a',
  cardBorder: '#1e1e2e',
  accent: '#6c5ce7',
  accentLight: '#a29bfe',
  green: '#00b894',
  greenLight: '#55efc4',
  orange: '#fdcb6e',
  red: '#ff6b6b',
  blue: '#74b9ff',
  text: '#e8e8f0',
  textDim: '#8888a0',
  textMuted: '#555570',
};
