import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Dumbbell,
} from 'lucide-react-native';
import { useRoutineStore } from '../../stores/routineStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Card, Button, Input, ExerciseThumbnail } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

// ── Stepper ───────────────────────────────────────────────────────────────────

type StepperProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
};

function Stepper({ label, value, min = 1, max = 99, onChange }: StepperProps) {
  return (
    <View style={stepStyles.row}>
      <Pressable
        style={[stepStyles.btn, value <= min && stepStyles.btnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        hitSlop={6}
      >
        <Minus size={13} color={value <= min ? colors.ink4 : colors.ink2} strokeWidth={2.5} />
      </Pressable>
      <View style={stepStyles.valueWrap}>
        <Text style={stepStyles.value}>{value}</Text>
        <Text style={stepStyles.label}>{label}</Text>
      </View>
      <Pressable
        style={[stepStyles.btn, value >= max && stepStyles.btnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        hitSlop={6}
      >
        <Plus size={13} color={value >= max ? colors.ink4 : colors.ink2} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } satisfies ViewStyle,
  btn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  btnDisabled: { opacity: 0.4 } satisfies ViewStyle,
  valueWrap: {
    alignItems: 'center',
    minWidth: 32,
  } satisfies ViewStyle,
  value: {
    ...(typography.bodyMedium as TextStyle),
  } satisfies TextStyle,
  label: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    marginTop: 1,
  } satisfies TextStyle,
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditRoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { user } = useAuthStore();

  const {
    name,
    exercises,
    setName,
    setExercises,
    removeExercise,
    updateExercise,
    moveExercise,
    reset,
  } = useRoutineStore();

  const [loadingRoutine, setLoadingRoutine] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load the existing routine into the store on mount.
  useEffect(() => {
    if (!routineId) return;
    let cancelled = false;

    const load = async () => {
      setLoadingRoutine(true);
      setLoadError(null);

      const [{ data: routine, error: rErr }, { data: exRows, error: eErr }] =
        await Promise.all([
          supabase
            .from('user_routines')
            .select('name')
            .eq('id', routineId)
            .single(),
          supabase
            .from('user_routine_exercises')
            .select(
              'exercise_id, order_index, default_sets, default_reps, exercises(name)',
            )
            .eq('routine_id', routineId)
            .order('order_index', { ascending: true }),
        ]);

      if (cancelled) return;

      if (rErr || !routine) {
        setLoadError(rErr?.message ?? 'Routine not found.');
        setLoadingRoutine(false);
        return;
      }
      if (eErr) {
        setLoadError(eErr.message);
        setLoadingRoutine(false);
        return;
      }

      type ExRow = {
        exercise_id: string;
        order_index: number;
        default_sets: number;
        default_reps: number;
        exercises: { name: string } | null;
      };
      const rows = ((exRows ?? []) as unknown) as ExRow[];

      setName(routine.name);
      setExercises(
        rows.map((r, idx) => ({
          exerciseId: r.exercise_id,
          name: r.exercises?.name ?? 'Exercise',
          order: idx,
          defaultSets: r.default_sets,
          defaultReps: r.default_reps,
        })),
      );
      setLoadingRoutine(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [routineId, setName, setExercises]);

  // Clear store when this screen unmounts.
  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  const handleCancel = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  const handleSave = useCallback(async () => {
    if (!user || !routineId) return;
    if (!name.trim()) { setSaveError('Routine name is required.'); return; }
    if (exercises.length === 0) { setSaveError('Add at least one exercise.'); return; }

    setSaving(true);
    setSaveError(null);

    try {
      // 1. Update routine name.
      const { error: nameErr } = await supabase
        .from('user_routines')
        .update({ name: name.trim() })
        .eq('id', routineId);
      if (nameErr) throw nameErr;

      // 2. Replace all exercises: delete then re-insert in current order.
      const { error: delErr } = await supabase
        .from('user_routine_exercises')
        .delete()
        .eq('routine_id', routineId);
      if (delErr) throw delErr;

      const rows = exercises.map((ex, idx) => ({
        routine_id: routineId,
        exercise_id: ex.exerciseId,
        order_index: idx,
        default_sets: ex.defaultSets,
        default_reps: ex.defaultReps,
      }));

      const { error: insErr } = await supabase
        .from('user_routine_exercises')
        .insert(rows);
      if (insErr) throw insErr;

      reset();
      router.back();
    } catch (e: unknown) {
      setSaveError(
        (e as { message?: string })?.message ?? 'Could not save changes.',
      );
      setSaving(false);
    }
  }, [user, routineId, name, exercises, reset, router]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleCancel} hitSlop={8}>
          <X size={22} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.title}>Edit Routine</Text>
        <Button
          label={saving ? 'Saving…' : 'Save'}
          size="compact"
          disabled={saving || loadingRoutine}
          onPress={handleSave}
        />
      </View>

      {/* Loading / error states */}
      {loadingRoutine ? (
        <View style={styles.centeredState}>
          <Text style={styles.stateText}>Loading…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centeredState}>
          <Text style={[styles.stateText, { color: colors.alert }]}>{loadError}</Text>
          <Button
            label="Go back"
            variant="secondary"
            onPress={handleCancel}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing['3xl'] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Routine name */}
          <Input
            label="Routine Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              EXERCISES{exercises.length > 0 ? ` (${exercises.length})` : ''}
            </Text>
            <Pressable
              onPress={() => router.push('/(modals)/exercise-picker?target=routine')}
              hitSlop={8}
            >
              <Text style={styles.addLabel}>+ Add Exercise</Text>
            </Pressable>
          </View>

          {exercises.length === 0 ? (
            <Card padding="comfortable" style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Dumbbell size={24} color={colors.ink4} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyText}>No exercises in this routine.</Text>
              <Button
                label="Add Exercise"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/(modals)/exercise-picker?target=routine')}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : (
            <View style={styles.exerciseList}>
              {exercises.map((ex, idx) => (
                <Card key={ex.exerciseId} padding="compact">
                  {/* Row 1: thumbnail · name · reorder · delete */}
                  <View style={styles.exRow}>
                    <ExerciseThumbnail variant="small" />

                    <Text style={styles.exName} numberOfLines={2}>
                      {ex.name}
                    </Text>

                    <View style={styles.exActions}>
                      <Pressable
                        style={[styles.iconBtn, idx === 0 && styles.iconBtnDisabled]}
                        onPress={() => moveExercise(ex.exerciseId, 'up')}
                        disabled={idx === 0}
                        hitSlop={6}
                      >
                        <ChevronUp
                          size={16}
                          color={idx === 0 ? colors.ink4 : colors.ink2}
                          strokeWidth={2}
                        />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.iconBtn,
                          idx === exercises.length - 1 && styles.iconBtnDisabled,
                        ]}
                        onPress={() => moveExercise(ex.exerciseId, 'down')}
                        disabled={idx === exercises.length - 1}
                        hitSlop={6}
                      >
                        <ChevronDown
                          size={16}
                          color={
                            idx === exercises.length - 1 ? colors.ink4 : colors.ink2
                          }
                          strokeWidth={2}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            'Remove Exercise',
                            `Remove "${ex.name}" from this routine?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => removeExercise(ex.exerciseId),
                              },
                            ],
                          )
                        }
                        hitSlop={6}
                      >
                        <Trash2 size={16} color={colors.alert} strokeWidth={1.75} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Row 2: sets + reps steppers */}
                  <View style={styles.steppersRow}>
                    <Stepper
                      label="sets"
                      value={ex.defaultSets}
                      min={1}
                      max={20}
                      onChange={(n) =>
                        updateExercise(ex.exerciseId, { defaultSets: n })
                      }
                    />
                    <Text style={styles.times}>×</Text>
                    <Stepper
                      label="reps"
                      value={ex.defaultReps}
                      min={1}
                      max={99}
                      onChange={(n) =>
                        updateExercise(ex.exerciseId, { defaultReps: n })
                      }
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}

          {saveError ? (
            <Text style={styles.errorText}>{saveError}</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  } satisfies ViewStyle,

  title: { ...(typography.subheading as TextStyle) } satisfies TextStyle,

  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  } satisfies ViewStyle,
  stateText: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
  } satisfies TextStyle,

  scroll: { flex: 1 } satisfies ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.md,
  } satisfies ViewStyle,

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  } satisfies ViewStyle,
  sectionLabel: { ...(typography.label as TextStyle) } satisfies TextStyle,
  addLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accent,
    fontSize: 14,
  } satisfies TextStyle,

  emptyCard: { alignItems: 'center' } satisfies ViewStyle,
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  emptyText: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  exerciseList: { gap: spacing.md } satisfies ViewStyle,

  // Exercise card rows
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  } satisfies ViewStyle,
  exName: {
    ...(typography.bodyMedium as TextStyle),
    flex: 1,
  } satisfies TextStyle,
  exActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } satisfies ViewStyle,
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  iconBtnDisabled: { opacity: 0.35 } satisfies ViewStyle,

  steppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: 36 + spacing.md, // align under name, past thumbnail
  } satisfies ViewStyle,
  times: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
