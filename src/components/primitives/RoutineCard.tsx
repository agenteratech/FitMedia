import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Dumbbell, Timer, MoreHorizontal, GripVertical } from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Chip } from './Chip';
import { colors, spacing, typography, radius } from '@/theme';

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
  /**
   * When provided, a drag-handle icon is shown and the card enters
   * "reorderable" mode. Call `drag()` inside a long-press handler on the
   * handle to activate dragging via react-native-draggable-flatlist.
   */
  onDragStart?: () => void;
  /** Visual active state while the card is being dragged. */
  isDragging?: boolean;
}

export function RoutineCard({
  routine,
  onStart,
  onPress,
  onMore,
  onDragStart,
  isDragging = false,
}: RoutineCardProps) {
  const exercisePreview =
    routine.exerciseNames.slice(0, 3).join(', ') +
    (routine.exerciseNames.length > 3 ? ` +${routine.exerciseNames.length - 3} more` : '');

  return (
    <Card padding="default" style={isDragging ? styles.dragging : undefined}>
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

          {/* Drag handle — shown only in reorderable context */}
          {onDragStart ? (
            <Pressable
              onLongPress={onDragStart}
              delayLongPress={150}
              hitSlop={10}
              style={styles.dragHandle}
              accessibilityLabel="Drag to reorder"
            >
              <GripVertical size={18} color={colors.ink4} strokeWidth={1.75} />
            </Pressable>
          ) : null}

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
  dragging: {
    shadowColor: colors.ink1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  } satisfies ViewStyle,
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
  dragHandle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
  } satisfies ViewStyle,
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
