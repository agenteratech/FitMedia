import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Trash2, ChevronUp, ChevronDown, Plus, Minus, Dumbbell } from 'lucide-react-native';
import { useRoutineStore } from '../../stores/routineStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { getJSON, setJSON, storageKeys } from '../../lib/storage';
import { Card, Button, Input, ExerciseThumbnail } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

// ── NumberField ───────────────────────────────────────────────────────────────
// Tappable center value (direct keyboard entry) + flanking +/- buttons.

type NumberFieldProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  decimal?: boolean;
};
type NumberFieldCallbacks = { onChange: (n: number) => void };

function NumberField({
  label,
  value,
  min = 0,
  max = 999,
  step = 1,
  decimal = false,
  onChange,
}: NumberFieldProps & NumberFieldCallbacks) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Keep display in sync when the value changes externally (e.g. +/- buttons in
  // a sibling field) but only while not actively typing.
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const commit = useCallback(
    (raw: string) => {
      const n = decimal ? parseFloat(raw) : parseInt(raw, 10);
      if (!isNaN(n)) {
        const clamped = Math.min(max, Math.max(min, n));
        onChange(clamped);
        setText(String(clamped));
      } else {
        setText(String(value));
      }
    },
    [decimal, max, min, value, onChange],
  );

  const decrement = useCallback(() => {
    const next = decimal
      ? Math.round((value - step) * 1000) / 1000
      : value - step;
    onChange(Math.max(min, next));
  }, [decimal, min, step, value, onChange]);

  const increment = useCallback(() => {
    const next = decimal
      ? Math.round((value + step) * 1000) / 1000
      : value + step;
    onChange(Math.min(max, next));
  }, [decimal, max, step, value, onChange]);

  const canDec = value > min;
  const canInc = value < max;

  return (
    <View style={nfStyles.col}>
      <View style={nfStyles.row}>
        <Pressable
          style={[nfStyles.btn, !canDec && nfStyles.btnOff]}
          onPress={decrement}
          disabled={!canDec}
          hitSlop={8}
        >
          <Minus size={11} color={canDec ? colors.ink2 : colors.ink4} strokeWidth={2.5} />
        </Pressable>

        <TextInput
          style={nfStyles.input}
          value={focused ? text : String(value)}
          onChangeText={setText}
          onFocus={() => {
            setFocused(true);
            setText(String(value));
          }}
          onBlur={() => {
            setFocused(false);
            commit(text);
          }}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          selectTextOnFocus
          maxLength={6}
          returnKeyType="done"
        />

        <Pressable
          style={[nfStyles.btn, !canInc && nfStyles.btnOff]}
          onPress={increment}
          disabled={!canInc}
          hitSlop={8}
        >
          <Plus size={11} color={canInc ? colors.ink2 : colors.ink4} strokeWidth={2.5} />
        </Pressable>
      </View>
      <Text style={nfStyles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const nfStyles = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  } satisfies ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  } satisfies ViewStyle,
  btn: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies ViewStyle,
  btnOff: { opacity: 0.35 } satisfies ViewStyle,
  input: {
    flex: 1,
    ...(typography.subheading as TextStyle),
    fontSize: 15,
    color: colors.ink1,
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
    minWidth: 0, // prevent intrinsic width from breaking layout
  } satisfies TextStyle,
  label: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    fontSize: 10,
    textAlign: 'center',
  } satisfies TextStyle,
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditRoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { user } = useAuthStore();

  const { name, exercises, setName, setExercises, removeExercise, updateExercise, moveExercise, reset } =
    useRoutineStore();

  const [loadingRoutine, setLoadingRoutine] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing routine + stored weights on mount.
  useEffect(() => {
    if (!routineId) return;
    let cancelled = false;

    const load = async () => {
      setLoadingRoutine(true);
      setLoadError(null);

      const [{ data: routine, error: rErr }, { data: exRows, error: eErr }] =
        await Promise.all([
          supabase.from('user_routines').select('name').eq('id', routineId).single(),
          supabase
            .from('user_routine_exercises')
            .select('exercise_id, order_index, default_sets, default_reps, exercises(name)')
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
      const weightCache = getJSON<Record<string, number>>(storageKeys.routineWeights) ?? {};

      setName(routine.name);
      setExercises(
        rows.map((r, idx) => ({
          exerciseId: r.exercise_id,
          name: r.exercises?.name ?? 'Exercise',
          order: idx,
          defaultSets: r.default_sets,
          defaultReps: r.default_reps,
          defaultWeight: weightCache[`${routineId}_${r.exercise_id}`] ?? 0,
        })),
      );
      setLoadingRoutine(false);
    };

    load();
    return () => { cancelled = true; };
  }, [routineId, setName, setExercises]);

  // Clear store on unmount.
  useEffect(() => { return () => { reset(); }; }, [reset]);

  const handleCancel = useCallback(() => { reset(); router.back(); }, [reset, router]);

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

      // 2. Replace exercises (delete + re-insert).
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
      const { error: insErr } = await supabase.from('user_routine_exercises').insert(rows);
      if (insErr) throw insErr;

      // 3. Persist default weights in MMKV (not in DB schema).
      const weightCache = getJSON<Record<string, number>>(storageKeys.routineWeights) ?? {};
      exercises.forEach((ex) => {
        const key = `${routineId}_${ex.exerciseId}`;
        if (ex.defaultWeight > 0) {
          weightCache[key] = ex.defaultWeight;
        } else {
          delete weightCache[key];
        }
      });
      setJSON(storageKeys.routineWeights, weightCache);

      reset();
      router.back();
    } catch (e: unknown) {
      setSaveError((e as { message?: string })?.message ?? 'Could not save changes.');
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

      {loadingRoutine ? (
        <View style={styles.centeredState}>
          <Text style={styles.stateText}>Loading…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centeredState}>
          <Text style={[styles.stateText, { color: colors.alert }]}>{loadError}</Text>
          <Button label="Go back" variant="secondary" onPress={handleCancel} style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Routine name */}
          <Input label="Routine Name" value={name} onChangeText={setName} autoCapitalize="words" />

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
                  {/* ── Header row: thumbnail · name · reorder · delete ── */}
                  <View style={styles.exHeader}>
                    <ExerciseThumbnail variant="small" />
                    <Text style={styles.exName} numberOfLines={2}>
                      {ex.name}
                    </Text>
                    <View style={styles.exActions}>
                      <Pressable
                        style={[styles.iconBtn, idx === 0 && styles.iconBtnOff]}
                        onPress={() => moveExercise(ex.exerciseId, 'up')}
                        disabled={idx === 0}
                        hitSlop={6}
                      >
                        <ChevronUp
                          size={15}
                          color={idx === 0 ? colors.ink4 : colors.ink2}
                          strokeWidth={2}
                        />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.iconBtn,
                          idx === exercises.length - 1 && styles.iconBtnOff,
                        ]}
                        onPress={() => moveExercise(ex.exerciseId, 'down')}
                        disabled={idx === exercises.length - 1}
                        hitSlop={6}
                      >
                        <ChevronDown
                          size={15}
                          color={idx === exercises.length - 1 ? colors.ink4 : colors.ink2}
                          strokeWidth={2}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.iconBtn}
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
                        <Trash2 size={15} color={colors.alert} strokeWidth={1.75} />
                      </Pressable>
                    </View>
                  </View>

                  {/* ── 3-column controls: Weight | Sets | Reps ── */}
                  <View style={styles.controlsGrid}>
                    <NumberField
                      label="kg"
                      value={ex.defaultWeight}
                      min={0}
                      max={500}
                      step={2.5}
                      decimal
                      onChange={(n) => updateExercise(ex.exerciseId, { defaultWeight: n })}
                    />
                    <View style={styles.colDivider} />
                    <NumberField
                      label="sets"
                      value={ex.defaultSets}
                      min={1}
                      max={20}
                      step={1}
                      onChange={(n) => updateExercise(ex.exerciseId, { defaultSets: n })}
                    />
                    <View style={styles.colDivider} />
                    <NumberField
                      label="reps"
                      value={ex.defaultReps}
                      min={1}
                      max={99}
                      step={1}
                      onChange={(n) => updateExercise(ex.exerciseId, { defaultReps: n })}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}

          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
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
  emptyText: { ...(typography.body as TextStyle), color: colors.ink3 } satisfies TextStyle,

  exerciseList: { gap: spacing.md } satisfies ViewStyle,

  // Exercise card — header row
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  exName: {
    ...(typography.bodyMedium as TextStyle),
    flex: 1,
    flexShrink: 1, // allow wrapping without pushing siblings out of card
  } satisfies TextStyle,
  exActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0, // actions never shrink — they're always fully visible
  } satisfies ViewStyle,
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  iconBtnOff: { opacity: 0.35 } satisfies ViewStyle,

  // 3-column control grid
  controlsGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    overflow: 'hidden',
  } satisfies ViewStyle,
  colDivider: {
    width: 1,
    backgroundColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,

  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
