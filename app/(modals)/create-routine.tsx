import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Trash2 } from 'lucide-react-native';
import { useRoutineStore } from '../../stores/routineStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Card, Button, Input, ExerciseThumbnail } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function CreateRoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { name, exercises, setName, removeExercise, reset } = useRoutineStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    reset();
    router.back();
  };

  const handleSave = async () => {
    if (!user) { setError('Please sign in to continue.'); return; }
    if (!name.trim()) { setError('Please name your routine.'); return; }
    if (exercises.length === 0) {
      setError('Add at least one exercise to save this routine.');
      return;
    }

    setSaving(true);
    setError(null);

    const { data: routine, error: routineError } = await supabase
      .from('user_routines')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();

    if (routineError || !routine) {
      setError(routineError?.message ?? 'Unable to save routine.');
      setSaving(false);
      return;
    }

    const rows = exercises.map((ex) => ({
      routine_id: routine.id,
      exercise_id: ex.exerciseId,
      order_index: ex.order,
      default_sets: ex.defaultSets,
      default_reps: ex.defaultReps,
    }));

    const { error: exError } = await supabase
      .from('user_routine_exercises')
      .insert(rows);

    if (exError) {
      await supabase.from('user_routines').delete().eq('id', routine.id);
      setError(exError.message);
      setSaving(false);
      return;
    }

    reset();
    setSaving(false);
    router.replace('/(tabs)/routines');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleCancel} hitSlop={8}>
          <X size={22} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.title}>New Routine</Text>
        <Button
          label={saving ? 'Saving…' : 'Save'}
          size="compact"
          disabled={saving}
          onPress={handleSave}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing['2xl'] },
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

        {/* Exercises section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            EXERCISES{exercises.length > 0 ? ` (${exercises.length})` : ''}
          </Text>
          <Pressable
            onPress={() => router.push('/(modals)/exercise-picker?target=routine')}
            hitSlop={8}
          >
            <Text style={styles.addExerciseLabel}>+ Add Exercise</Text>
          </Pressable>
        </View>

        {exercises.length === 0 ? (
          <Card padding="comfortable" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No exercises added yet.</Text>
            <Button
              label="Add Exercise"
              variant="secondary"
              fullWidth
              onPress={() => router.push('/(modals)/exercise-picker?target=routine')}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          exercises.map((ex) => (
            <Card key={ex.exerciseId} padding="compact">
              <View style={styles.exRow}>
                <ExerciseThumbnail variant="small" />
                <View style={styles.exText}>
                  <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
                  <Text style={styles.exMeta}>
                    {ex.defaultSets} sets · {ex.defaultReps} reps
                  </Text>
                </View>
                <Pressable
                  onPress={() => removeExercise(ex.exerciseId)}
                  hitSlop={8}
                >
                  <Trash2 size={16} color={colors.alert} strokeWidth={1.75} />
                </Pressable>
              </View>
            </Card>
          ))
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  addExerciseLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accent,
    fontSize: 14,
  } satisfies TextStyle,
  emptyCard: { alignItems: 'center' } satisfies ViewStyle,
  emptyText: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,
  exText: { flex: 1 } satisfies ViewStyle,
  exName: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  exMeta: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
