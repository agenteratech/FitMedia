import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type DotType = 'workout' | 'diet' | 'sleep';

const DOT_COLORS: Record<DotType, string> = {
  workout: colors.accent,
  diet: colors.success,
  sleep: '#7B8FD4', // muted blue — not a status color, just a distinct marker
};

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface DayPillProps {
  date: Date;
  state?: 'default' | 'today' | 'selected';
  dots?: DotType[];
  onPress?: () => void;
}

/**
 * DayPill primitive.
 * 56×72px, 20px radius. Shows weekday letter, date number, and up to 3 activity dots.
 */
export function DayPill({ date, state = 'default', dots = [], onPress }: DayPillProps) {
  const isSelected = state === 'selected';
  const isToday = state === 'today';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        isSelected && styles.containerSelected,
        isToday && !isSelected && styles.containerToday,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        style={[
          styles.weekday,
          isSelected ? styles.textOnDark : isToday ? styles.textAccent : styles.textMuted,
        ]}
      >
        {WEEKDAY[date.getDay()]}
      </Text>
      <Text
        style={[
          styles.dateNum,
          isSelected ? styles.textOnDark : styles.textPrimary,
        ]}
      >
        {date.getDate()}
      </Text>
      <View style={styles.dotRow}>
        {dots.slice(0, 3).map((type, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: isSelected ? colors.surface : DOT_COLORS[type] }]}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 72,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  } satisfies ViewStyle,
  containerSelected: {
    backgroundColor: colors.ink1,
  } satisfies ViewStyle,
  containerToday: {
    backgroundColor: colors.accentSoft,
  } satisfies ViewStyle,
  weekday: {
    ...(typography.label as TextStyle),
    fontSize: 10,
  } satisfies TextStyle,
  dateNum: {
    ...(typography.subheading as TextStyle),
    fontSize: 16,
  } satisfies TextStyle,
  textPrimary: {
    color: colors.ink1,
  } satisfies TextStyle,
  textMuted: {
    color: colors.ink3,
  } satisfies TextStyle,
  textAccent: {
    color: colors.accent,
  } satisfies TextStyle,
  textOnDark: {
    color: colors.surface,
  } satisfies TextStyle,
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
  } satisfies ViewStyle,
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
});
