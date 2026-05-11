import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Sparkles, Check, Trash2, RotateCcw } from 'lucide-react-native';
import { colors, radius, spacing, typography, numericStyle } from '@/theme';

export interface SetRowProps {
  setNumber: number;
  kg: string;
  reps: string;
  rir: string;
  previous?: { kg: number; reps: number };
  isDone: boolean;
  isActive: boolean;
  isPR: boolean;
  showPrevious?: boolean;
  onChangeKg: (v: string) => void;
  onChangeReps: (v: string) => void;
  onChangeRir: (v: string) => void;
  onToggleDone: () => void;
  onDelete?: () => void;
}

/**
 * SetRow — swipe LEFT to delete, swipe RIGHT to toggle done/undo.
 * The checkmark button also remains for quick tap-to-complete.
 */
export function SetRow({
  setNumber,
  kg,
  reps,
  rir,
  previous,
  isDone,
  isActive,
  isPR,
  showPrevious = false,
  onChangeKg,
  onChangeReps,
  onChangeRir,
  onToggleDone,
  onDelete,
}: SetRowProps) {
  const swipeRef = useRef<Swipeable>(null);

  // Swipe LEFT → red Delete panel (user taps to confirm)
  const renderRightActions = () => {
    if (!onDelete) return null;
    return (
      <Pressable
        style={styles.swipeDelete}
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}
      >
        <Trash2 size={18} color={colors.surface} strokeWidth={2} />
        <Text style={styles.swipeLabel}>Delete</Text>
      </Pressable>
    );
  };

  // Swipe RIGHT → green Done / gray Undo panel (auto-triggers on full swipe)
  const renderLeftActions = () => (
    <View style={[styles.swipeDone, isDone && styles.swipeUndo]}>
      {isDone
        ? <RotateCcw size={18} color={colors.surface} strokeWidth={2} />
        : <Check size={18} color={colors.surface} strokeWidth={2} />}
      <Text style={styles.swipeLabel}>{isDone ? 'Undo' : 'Done'}</Text>
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        // Full swipe right = auto-toggle done
        if (direction === 'left') {
          swipeRef.current?.close();
          onToggleDone();
        }
        // Full swipe left leaves panel open so user can tap Delete
      }}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={60}
      rightThreshold={60}
    >
      <View
        style={[
          styles.row,
          isDone && styles.rowDone,
          isActive && styles.rowActive,
        ]}
      >
        {/* Set number / PR badge */}
        <View style={styles.colSet}>
          {isPR ? (
            <Sparkles size={16} color={colors.accent} strokeWidth={1.75} />
          ) : (
            <Text style={[styles.setNum, numericStyle]}>{setNumber}</Text>
          )}
        </View>

        {/* Previous (optional) */}
        {showPrevious ? (
          <View style={styles.colPrev}>
            {previous ? (
              <Text style={[styles.prevText, numericStyle]}>
                {previous.kg}×{previous.reps}
              </Text>
            ) : (
              <Text style={styles.prevText}>—</Text>
            )}
          </View>
        ) : null}

        {/* kg input */}
        <View style={styles.colInput}>
          <TextInput
            style={[styles.inputField, numericStyle]}
            value={kg}
            onChangeText={onChangeKg}
            keyboardType="decimal-pad"
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={colors.ink4}
          />
        </View>

        {/* reps input */}
        <View style={styles.colInput}>
          <TextInput
            style={[styles.inputField, numericStyle]}
            value={reps}
            onChangeText={onChangeReps}
            keyboardType="number-pad"
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={colors.ink4}
          />
        </View>

        {/* RIR input — optional, 0-6 range */}
        <View style={styles.colRir}>
          <TextInput
            style={[styles.inputField, styles.inputRir, numericStyle]}
            value={rir}
            onChangeText={(v) => {
              const n = v.replace(/[^0-9]/g, '');
              onChangeRir(n.length > 0 ? String(Math.min(9, parseInt(n, 10))) : '');
            }}
            keyboardType="number-pad"
            selectTextOnFocus
            placeholder="—"
            placeholderTextColor={colors.ink4}
            maxLength={1}
          />
        </View>

        {/* Done toggle */}
        <Pressable
          style={[styles.doneBtn, isDone && styles.doneBtnActive]}
          onPress={onToggleDone}
        >
          <Check size={14} color={isDone ? colors.surface : colors.ink3} strokeWidth={2} />
        </Pressable>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    backgroundColor: colors.surface,
  } satisfies ViewStyle,
  rowDone: {
    backgroundColor: colors.successSoft,
  } satisfies ViewStyle,
  rowActive: {
    borderLeftColor: colors.accent,
    backgroundColor: colors.accentSoft,
  } satisfies ViewStyle,
  colSet: {
    width: 28,
    alignItems: 'center',
  } satisfies ViewStyle,
  colPrev: {
    flex: 1.2,
    alignItems: 'center',
  } satisfies ViewStyle,
  colInput: {
    flex: 1,
    alignItems: 'center',
  } satisfies ViewStyle,
  colRir: {
    flex: 0.75,
    alignItems: 'center',
  } satisfies ViewStyle,
  setNum: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink3,
    fontSize: 13,
  } satisfies TextStyle,
  prevText: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    fontSize: 12,
  } satisfies TextStyle,
  inputField: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink1,
    textAlign: 'center',
    height: 36,
    minWidth: 48,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    paddingHorizontal: spacing.sm,
  } satisfies TextStyle,
  inputRir: {
    minWidth: 36,
    paddingHorizontal: spacing.xs,
    borderColor: colors.accentSoft,
  } satisfies TextStyle,
  doneBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.ink4,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  doneBtnActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  } satisfies ViewStyle,
  // Swipe actions
  swipeDelete: {
    backgroundColor: colors.alert,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 3,
  } satisfies ViewStyle,
  swipeDone: {
    backgroundColor: colors.success,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 3,
  } satisfies ViewStyle,
  swipeUndo: {
    backgroundColor: colors.ink3,
  } satisfies ViewStyle,
  swipeLabel: {
    ...(typography.label as TextStyle),
    color: colors.surface,
    fontSize: 10,
  } satisfies TextStyle,
});
