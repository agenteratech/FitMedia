import React, { useMemo, useState } from 'react';
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
import { ChevronLeft, Clock, Dumbbell, Layers } from 'lucide-react-native';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useAuthStore } from '../../stores/authStore';
import { saveWorkout } from '../../lib/workouts/saveWorkout';
import { Card, Button, Chip, useSnackBar } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

export default function FinishWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { workoutType, startedAt, exercises, reset } = useWorkoutStore();
  const { show: showSnack } = useSnackBar();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const completedSets = exercises.flatMap((ex) =>
      ex.sets.filter((s) => s.completed && s.weight && s.reps)
    );
    const totalVolume = completedSets.reduce((t, s) => t + s.weight * s.reps, 0);
    const totalSets = completedSets.length;
    const totalExercises = exercises.filter((ex) =>
      ex.sets.some((s) => s.completed && s.weight && s.reps)
    ).length;
    const durationMinutes = startedAt
      ? Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))
      : null;
    return { totalVolume, totalSets, totalExercises, durationMinutes };
  }, [exercises, startedAt]);

  const handleSave = async () => {
    if (!user) { setError('Please sign in to continue.'); return; }
    if (exercises.length === 0) {
      setError('No exercises logged yet.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: saveError } = await saveWorkout({
      userId: user.id,
      workoutType,
      startedAt,
      exercises,
    });

    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }

    reset();
    showSnack('Workout saved');
    router.replace('/(tabs)/logs');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={22} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.title}>Save Workout</Text>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Workout name */}
        <Text style={styles.workoutName}>{workoutType}</Text>

        {/* Stats pills */}
        <View style={styles.statsRow}>
          {summary.durationMinutes ? (
            <Chip
              label={`${summary.durationMinutes} min`}
              icon={Clock}
            />
          ) : null}
          <Chip
            label={`${summary.totalExercises} exercise${summary.totalExercises !== 1 ? 's' : ''}`}
            icon={Dumbbell}
          />
          <Chip
            label={`${summary.totalSets} set${summary.totalSets !== 1 ? 's' : ''}`}
            icon={Layers}
          />
        </View>

        {/* Volume card */}
        <Card padding="comfortable">
          <Text style={styles.volumeLabel}>Total Volume</Text>
          <Text style={[styles.volumeValue, numericStyle]}>
            {summary.totalVolume.toFixed(1)} kg
          </Text>
        </Card>

        {/* Exercise breakdown */}
        {exercises.length > 0 && (
          <Card padding="default">
            <Text style={styles.sectionLabel}>EXERCISES</Text>
            <View style={{ gap: spacing.sm }}>
              {exercises.map((ex) => {
                const done = ex.sets.filter((s) => s.completed && s.weight && s.reps);
                if (!done.length) return null;
                const vol = done.reduce((t, s) => t + s.weight * s.reps, 0);
                return (
                  <View key={ex.exerciseId} style={styles.exRow}>
                    <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
                    <Text style={[styles.exMeta, numericStyle]}>
                      {done.length} × {vol.toFixed(0)} kg
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Photo stub */}
        <Card padding="comfortable" style={styles.photoStub}>
          <Text style={styles.photoStubLabel}>Photo · Coming soon</Text>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={saving ? 'Saving…' : 'Save Workout'}
          fullWidth
          disabled={saving}
          onPress={handleSave}
        />
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
    paddingTop: spacing.xl,
    gap: spacing.md,
  } satisfies ViewStyle,
  workoutName: {
    ...(typography.display as TextStyle),
    marginBottom: spacing.xs,
  } satisfies TextStyle,
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  volumeLabel: {
    ...(typography.label as TextStyle),
    marginBottom: spacing.xs,
  } satisfies TextStyle,
  volumeValue: {
    ...(typography.displayXl as TextStyle),
  } satisfies TextStyle,
  sectionLabel: {
    ...(typography.label as TextStyle),
    marginBottom: spacing.sm,
  } satisfies TextStyle,
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  } satisfies ViewStyle,
  exName: {
    ...(typography.body as TextStyle),
    flex: 1,
    marginRight: spacing.md,
  } satisfies TextStyle,
  exMeta: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  photoStub: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSunk,
  } satisfies ViewStyle,
  photoStubLabel: {
    ...(typography.caption as TextStyle),
    color: colors.ink4,
  } satisfies TextStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
