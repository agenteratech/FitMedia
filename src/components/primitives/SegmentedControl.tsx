import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, radius, spacing, shadows, typography } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * SegmentedControl primitive.
 * 56px tall, 18px radius outer, surfaceSunk background.
 * Active segment: white fill, 14px radius, subtle shadow.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: radius.button,
    backgroundColor: colors.surfaceSunk,
    flexDirection: 'row',
    padding: spacing.xs,
    alignItems: 'center',
  } satisfies ViewStyle,
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radius.buttonCompact,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.snackBar,
    // override shadow to be subtler for the active segment
    shadowOpacity: 0.06,
    elevation: 2,
  } satisfies ViewStyle,
  label: {
    ...(typography.bodyMedium as TextStyle),
    fontSize: 14,
  } satisfies TextStyle,
  labelActive: {
    color: colors.ink1,
  } satisfies TextStyle,
  labelInactive: {
    color: colors.ink3,
  } satisfies TextStyle,
});
