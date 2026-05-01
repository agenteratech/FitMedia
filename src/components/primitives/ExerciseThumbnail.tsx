import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { colors } from '@/theme';

export interface ExerciseThumbnailProps {
  variant?: 'small' | 'default';
  /** Slot for per-exercise artwork. Falls back to Dumbbell icon. */
  thumbnail?: React.ReactNode;
}

/**
 * ExerciseThumbnail — circular icon slot for an exercise.
 * default: 56×56, small: 40×40.
 * Shows Dumbbell icon until per-exercise artwork is provided via `thumbnail`.
 */
export function ExerciseThumbnail({ variant = 'default', thumbnail }: ExerciseThumbnailProps) {
  const size = variant === 'small' ? 40 : 56;
  const iconSize = variant === 'small' ? 18 : 24;

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}>
      {thumbnail ?? (
        <Dumbbell size={iconSize} color={colors.ink2} strokeWidth={1.75} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#EBE7E0', // colors.surfaceSunk
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
});
