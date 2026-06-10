import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Dumbbell, Timer, MoreHorizontal } from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Chip } from './Chip';
import { colors, spacing, typography } from '@/theme';

export interface RoutineSummary {
  id: string;
  name: string;
  exerciseNames: string[];
  estimatedMinutes?: number;
  lastUsedAt?: string | null;
}

export interface RoutineCardProps {
  routine: RoutineSummary;
  onStart: () => void;
  /** Tap on the card body (name / exercise list) — typically opens the editor. */
  onPress?: () => void;
  onMore?: () => void;
}

export function RoutineCard({ routine, onStart, onPress, onMore }: RoutineCardProps) {
  const exercisePreview =
    routine.exerciseNames.slice(0, 3).join(', ') +
    (routine.exerciseNames.length > 3 ? ` +${routine.exerciseNames.length - 3} more` : '');

  return (
    <Card padding="default">
      {/* Tappable area: name + preview + chips → opens editor */}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => (pressed && onPress ? styles.pressed : undefined)}
      >
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {routine.name}
          </Text>
          {onMore ? (
            <Pressable onPress={onMore} hitSlop={10} accessibilityLabel="More options">
              <MoreHorizontal size={20} color={colors.ink3} strokeWidth={1.75} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.preview} numberOfLines={2}>
          {exercisePreview}
        </Text>

        <View style={styles.chips}>
          <Chip label={`${routine.exerciseNames.length} exercises`} icon={Dumbbell} />
          {routine.estimatedMinutes ? (
            <Chip label={`≈ ${routine.estimatedMinutes} min`} icon={Timer} />
          ) : null}
        </View>
      </Pressable>

      <Button
        label="Start Workout"
        icon={Dumbbell}
        fullWidth
        onPress={onStart}
        style={styles.cta}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 } satisfies ViewStyle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  name: {
    ...(typography.subheading as TextStyle),
    flex: 1,
    marginRight: spacing.sm,
  } satisfies TextStyle,
  preview: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginBottom: spacing.md,
  } satisfies TextStyle,
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  } satisfies ViewStyle,
  cta: {} satisfies ViewStyle,
});
