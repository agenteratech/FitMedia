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
import { Plus } from 'lucide-react-native';
import { Card } from './Card';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { SetRow } from './SetRow';
import { colors, spacing, typography, radius } from '@/theme';

export interface SetDraft {
  kg: string;
  reps: string;
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
  onAddSet: () => void;
  onUpdateSet: (index: number, patch: Partial<SetDraft>) => void;
  onRemoveSet: (index: number) => void;
}

/**
 * ExerciseCard — composes Card + ExerciseThumbnail + name + optional notes + sets table.
 * Used in active-workout and create-routine screens.
 */
export function ExerciseCard({
  exercise,
  sets,
  showPrevious = false,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: ExerciseCardProps) {
  return (
    <Card padding="none" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <ExerciseThumbnail variant="small" />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>{exercise.name}</Text>
          {exercise.restSeconds ? (
            <Text style={styles.rest}>Rest {exercise.restSeconds}s</Text>
          ) : null}
        </View>
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
        <View style={{ width: 36 }} />
      </View>

      {/* Set rows */}
      {sets.map((set, i) => (
        <SetRow
          key={i}
          setNumber={i + 1}
          kg={set.kg}
          reps={set.reps}
          previous={set.previous}
          isDone={set.isDone}
          isActive={set.isActive}
          isPR={set.isPR}
          showPrevious={showPrevious}
          onChangeKg={(v) => onUpdateSet(i, { kg: v })}
          onChangeReps={(v) => onUpdateSet(i, { reps: v })}
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
