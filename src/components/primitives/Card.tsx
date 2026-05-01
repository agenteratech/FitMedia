import React from 'react';
import { View, type ViewProps, type ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type CardPadding = 'none' | 'compact' | 'default' | 'comfortable';

export interface CardProps extends ViewProps {
  /**
   * Internal padding preset.
   *  - 'none'        — 0 (you'll handle padding inside)
   *  - 'compact'     — 16px (small cards in dense lists)
   *  - 'default'     — 20px (the standard card from the design system)
   *  - 'comfortable' — 24px (hero cards like Body Score, Last Night)
   */
  padding?: CardPadding;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  compact: spacing.lg,
  default: spacing.xl,
  comfortable: spacing['2xl'],
};

/**
 * Card primitive.
 * White surface, 20px radius, 1px border. Never has a shadow.
 * If a card looks like it needs a shadow, you're probably using the wrong primitive
 * (you might want a Sheet or Modal instead).
 *
 * Usage:
 *   <Card>
 *     <Text style={typography.subheading}>Push Day</Text>
 *   </Card>
 *
 *   <Card padding="comfortable">
 *     <BodyScoreRing value={76} />
 *   </Card>
 */
export function Card({ padding = 'default', style, children, ...rest }: CardProps) {
  return React.createElement(
    View,
    { style: [styles.card, { padding: paddingMap[padding] }, style], ...rest },
    children
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,
});
