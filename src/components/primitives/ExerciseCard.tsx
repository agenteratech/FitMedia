import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Plus, Trash2, ChevronRight } from 'lucide-react-native';
import { Card } from './Card';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { SetRow } from './SetRow';
import { colors, spacing, typography, radius } from '@/theme';

export interface SetDraft {
  kg: string;
  reps: string;
  rir: string;
  isDone: boolean;
  isActive: boolean;
  isPR: boolean;
  previous?: { kg: number; reps: number };
}

export interface ExerciseDraft {
  id: string;
  name: string;
  notes?: string;
  restSeconds?: number;
}

export interface ExerciseCardProps {
  exercise: ExerciseDraft;
  sets: SetDraft[];
  showPrevious?: boolean;
  /** Optional node rendered under the exercise name (e.g. progressive-overload summary). */
  subtitle?: React.ReactNode;
  /** When provided, the name becomes tappable (e.g. to open exercise history). */
  onPressTitle?: () => void;
  onAddSet: () => void;
  onUpdateSet: (index: number, patch: Partial<SetDraft>) => void;
  onRemoveSet: (index: number) => void;
  onRemoveExercise?: () => void;
}

/**
 * ExerciseCard — composes Card + ExerciseThumbnail + name + optional notes + sets table.
 * Used in active-workout and create-routine screens.
 */
export function ExerciseCard({
  exercise,
  sets,
  showPrevious = false,
  subtitle,
  onPressTitle,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
}: ExerciseCardProps) {
  const subtitleNode =
    subtitle ??
    (exercise.restSeconds ? <Text style={styles.rest}>Rest {exercise.restSeconds}s</Text> : null);

  return (
    <Card padding="none" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <ExerciseThumbnail variant="small" />
        {onPressTitle ? (
          <Pressable style={styles.headerText} onPress={onPressTitle} hitSlop={6}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, styles.nameFlex]} numberOfLines={1}>{exercise.name}</Text>
              <ChevronRight size={15} color={colors.ink4} strokeWidth={1.75} />
            </View>
            {subtitleNode}
          </Pressable>
        ) : (
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>{exercise.name}</Text>
            {subtitleNode}
          </View>
        )}
        {onRemoveExercise ? (
          <Pressable onPress={onRemoveExercise} hitSlop={12} style={styles.removeExerciseBtn}>
            <Trash2 size={16} color={colors.ink3} strokeWidth={1.75} />
          </Pressable>
        ) : null}
      </View>

      {/* Column headers */}
      <View style={styles.colHeader}>
        <View style={{ width: 28 }}>
          <Text style={styles.colLabel}>SET</Text>
        </View>
        {showPrevious ? (
          <View style={{ flex: 1.2, alignItems: 'center' }}>
            <Text style={styles.colLabel}>PREV</Text>
          </View>
        ) : null}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.colLabel}>KG</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.colLabel}>REPS</Text>
        </View>
        <View style={{ flex: 0.75, alignItems: 'center' }}>
          <Text style={styles.colLabel}>RIR</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Set rows */}
      {sets.map((set, i) => (
        <SetRow
          key={i}
          setNumber={i + 1}
          kg={set.kg}
          reps={set.reps}
          rir={set.rir}
          previous={set.previous}
          isDone={set.isDone}
          isActive={set.isActive}
          isPR={set.isPR}
          showPrevious={showPrevious}
          onChangeKg={(v) => onUpdateSet(i, { kg: v })}
          onChangeReps={(v) => onUpdateSet(i, { reps: v })}
          onChangeRir={(v) => onUpdateSet(i, { rir: v })}
          onToggleDone={() => onUpdateSet(i, { isDone: !set.isDone })}
          onDelete={sets.length > 1 ? () => onRemoveSet(i) : undefined}
        />
      ))}

      {/* Add set */}
      <Pressable style={styles.addSetRow} onPress={onAddSet}>
        <Plus size={14} color={colors.accent} strokeWidth={1.75} />
        <Text style={styles.addSetLabel}>Add set</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  } satisfies ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: spacing.md,
  } satisfies ViewStyle,
  headerText: {
    flex: 1,
  } satisfies ViewStyle,
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } satisfies ViewStyle,
  nameFlex: {
    flexShrink: 1,
  } satisfies TextStyle,
  removeExerciseBtn: {
    padding: spacing.xs,
  } satisfies ViewStyle,
  name: {
    ...(typography.subheading as TextStyle),
    color: colors.ink1,
  } satisfies TextStyle,
  rest: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    paddingTop: 0,
  } satisfies ViewStyle,
  colLabel: {
    ...(typography.label as TextStyle),
    fontSize: 10,
  } satisfies TextStyle,
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  } satisfies ViewStyle,
  addSetLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accent,
    fontSize: 14,
  } satisfies TextStyle,
});
