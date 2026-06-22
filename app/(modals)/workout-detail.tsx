import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Sparkles, Dumbbell } from 'lucide-react-native';
import { useWorkoutDetail, type WorkoutDetailExercise } from '../../hooks/useWorkoutDetail';
import { Card } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

// Thousands separators without relying on Intl/Hermes locale support.
function grouped(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const { workout, loading, error } = useWorkoutDetail(workoutId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.ink3} />
        </View>
      ) : error || !workout ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Dumbbell size={28} color={colors.ink4} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyText}>{error ?? 'Workout not found.'}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + date */}
          <View style={styles.titleBlock}>
            <Text style={styles.workoutName}>{workout.workout_type}</Text>
            <Text style={styles.workoutDate}>{formatDateTime(workout.completed_at)}</Text>
          </View>

          {/* Stat grid */}
          <View style={styles.statGrid}>
            <StatTile
              label="Duration"
              value={workout.duration_minutes ? `${workout.duration_minutes}` : '—'}
              unit={workout.duration_minutes ? 'min' : undefined}
            />
            <StatTile label="Volume" value={grouped(workout.total_volume_kg)} unit="kg" />
            <StatTile label="Sets" value={String(workout.total_sets)} />
            <StatTile label="Exercises" value={String(workout.total_exercises)} />
          </View>

          {/* Exercise breakdown */}
          <Text style={styles.sectionLabel}>EXERCISE BREAKDOWN</Text>
          {workout.workout_exercises.length === 0 ? (
            <Card padding="comfortable">
              <Text style={styles.emptyText}>No exercise detail recorded for this session.</Text>
            </Card>
          ) : (
            workout.workout_exercises.map((ex) => (
              <ExerciseBlock
                key={ex.id}
                exercise={ex}
                onOpenHistory={
                  ex.exercise_id
                    ? () =>
                        router.push({
                          pathname: '/(modals)/exercise-history',
                          params: { exerciseId: ex.exercise_id as string, name: ex.exercise_name },
                        })
                    : undefined
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, numericStyle]}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ExerciseBlock({
  exercise,
  onOpenHistory,
}: {
  exercise: WorkoutDetailExercise;
  onOpenHistory?: () => void;
}) {
  const sets = [...exercise.workout_sets].sort((a, b) => a.set_number - b.set_number);
  const volume = sets.reduce((t, s) => t + s.weight_kg * s.reps, 0);

  return (
    <Card padding="none" style={styles.exCard}>
      <Pressable
        onPress={onOpenHistory}
        disabled={!onOpenHistory}
        style={({ pressed }) => [styles.exHeader, pressed && onOpenHistory ? styles.exHeaderPressed : null]}
      >
        <View style={styles.exHeaderText}>
          <Text style={styles.exName} numberOfLines={1}>{exercise.exercise_name}</Text>
          <Text style={[styles.exMeta, numericStyle]}>
            {sets.length} set{sets.length !== 1 ? 's' : ''} · {grouped(volume)} kg
          </Text>
        </View>
        {onOpenHistory ? <ChevronRight size={16} color={colors.ink4} strokeWidth={1.75} /> : null}
      </Pressable>

      {/* Column headers */}
      <View style={styles.setHeaderRow}>
        <Text style={[styles.setHeaderCell, styles.setNumCol]}>SET</Text>
        <Text style={[styles.setHeaderCell, styles.setKgCol]}>KG</Text>
        <Text style={[styles.setHeaderCell, styles.setRepsCol]}>REPS</Text>
        <View style={styles.setPrCol} />
      </View>

      {sets.map((s) => (
        <View key={s.id} style={styles.setRow}>
          <Text style={[styles.setCell, styles.setNumCol, numericStyle]}>{s.set_number}</Text>
          <Text style={[styles.setCell, styles.setKgCol, numericStyle]}>{s.weight_kg > 0 ? s.weight_kg : '—'}</Text>
          <Text style={[styles.setCell, styles.setRepsCol, numericStyle]}>{s.reps > 0 ? s.reps : '—'}</Text>
          <View style={styles.setPrCol}>
            {s.is_pr ? (
              <View style={styles.prBadge}>
                <Sparkles size={11} color={colors.accent} strokeWidth={2} />
                <Text style={styles.prBadgeText}>PR</Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
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
  headerTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing['2xl'],
  } satisfies ViewStyle,
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  emptyText: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
  } satisfies TextStyle,
  scroll: { flex: 1 } satisfies ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    gap: spacing.lg,
  } satisfies ViewStyle,
  titleBlock: { gap: spacing.xs } satisfies ViewStyle,
  workoutName: { ...(typography.display as TextStyle) } satisfies TextStyle,
  workoutDate: { ...(typography.body as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  } satisfies ViewStyle,
  statTile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  } satisfies ViewStyle,
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 } satisfies ViewStyle,
  statValue: { ...(typography.heading as TextStyle) } satisfies TextStyle,
  statUnit: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  statLabel: { ...(typography.label as TextStyle), color: colors.ink3 } satisfies TextStyle,

  sectionLabel: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    marginTop: spacing.xs,
  } satisfies TextStyle,

  // Exercise block
  exCard: { overflow: 'hidden' } satisfies ViewStyle,
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  } satisfies ViewStyle,
  exHeaderPressed: { backgroundColor: colors.surfaceSunk } satisfies ViewStyle,
  exHeaderText: { flex: 1 } satisfies ViewStyle,
  exName: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  exMeta: { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 2 } satisfies TextStyle,

  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  } satisfies ViewStyle,
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  } satisfies ViewStyle,
  setHeaderCell: { ...(typography.label as TextStyle), fontSize: 10, color: colors.ink3 } satisfies TextStyle,
  setCell: { ...(typography.body as TextStyle), fontSize: 14, color: colors.ink1 } satisfies TextStyle,
  setNumCol: { width: 40 } satisfies ViewStyle,
  setKgCol: { flex: 1 } satisfies ViewStyle,
  setRepsCol: { flex: 1 } satisfies ViewStyle,
  setPrCol: { width: 44, alignItems: 'flex-end' } satisfies ViewStyle,
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  prBadgeText: {
    ...(typography.label as TextStyle),
    fontSize: 10,
    color: colors.accent,
  } satisfies TextStyle,
});
