import React, { useRef, useEffect } from 'react';
import { ScrollView, View, StyleSheet, type ViewStyle } from 'react-native';
import { DayPill } from './DayPill';
import { spacing } from '@/theme';

type DotType = 'workout' | 'diet' | 'sleep';

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface WeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  markers?: Record<string, DotType[]>;
}

/**
 * WeekStrip primitive.
 * Horizontal row of 7 DayPills for the current week (Sun–Sat), centered on today.
 * Tapping a pill calls onSelectDate. markers keys are ISO date strings (YYYY-MM-DD).
 */
export function WeekStrip({ selectedDate, onSelectDate, markers = {} }: WeekStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(today);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayIso = toIso(today);
  const selectedIso = toIso(selectedDate);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {days.map((day) => {
        const iso = toIso(day);
        const isToday = iso === todayIso;
        const isSelected = iso === selectedIso;
        return (
          <View key={iso} style={styles.pillWrap}>
            <DayPill
              date={day}
              state={isSelected ? 'selected' : isToday ? 'today' : 'default'}
              dots={markers[iso] ?? []}
              onPress={() => onSelectDate(day)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
    alignItems: 'center',
  } satisfies ViewStyle,
  pillWrap: {
    // no extra style needed — DayPill has fixed dimensions
  } satisfies ViewStyle,
});
