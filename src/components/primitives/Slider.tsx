import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import RNSlider from '@react-native-community/slider';
import { colors, spacing, typography, numericStyle } from '../../theme';

export interface SliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  label?: string;
  formatValue?: (value: number) => string;
}

export function Slider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  label,
  formatValue,
}: SliderProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, numericStyle]}>
            {formatValue ? formatValue(value) : String(value)}
          </Text>
        </View>
      ) : null}
      <RNSlider
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.surfaceSunk}
        thumbTintColor={colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {} satisfies ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  label: {
    ...(typography.label as TextStyle),
  } satisfies TextStyle,
  value: {
    ...(typography.subheading as TextStyle),
    color: colors.ink1,
  } satisfies TextStyle,
});
