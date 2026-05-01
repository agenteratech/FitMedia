import React, { useState, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { Plus, Dumbbell, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useRoutines } from '../../hooks/useRoutines';
import { useWorkoutStore } from '../../stores/workoutStore';
import { RoutineCard, Button, Chip, Sheet } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

const FILTERS = ['All', 'Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'] as const;
type Filter = typeof FILTERS[number];

const FILTER_MUSCLES: Record<string, string[]> = {
  Push:        ['chest', 'shoulder', 'tricep', 'push'],
  Pull:        ['back', 'bicep', 'lat', 'row', 'pull', 'rear delt', 'rhomboid'],
  Legs:        ['quad', 'hamstring', 'glute', 'calf', 'leg', 'hip', 'adduct', 'abduct'],
  Upper:       ['chest', 'shoulder', 'tricep', 'back', 'bicep', 'lat', 'delt'],
  Lower:       ['quad', 'hamstring', 'glute', 'calf', 'leg', 'hip'],
  'Full Body': [],
};

export default function RoutinesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, loading, refetch } = useRoutines();
  const { reset, setWorkoutType, setStartedAt, upsertExercise } = useWorkoutStore();
  const [filter, setFilter] = useState<Filter>('All');
  const [sheetRoutineId, setSheetRoutineId] = useState<string | null>(null);
  const sheetRoutine = useMemo(
    () => items.find((r) => r.id === sheetRoutineId) ?? null,
    [items, sheetRoutineId]
  );

  const filtered = useMemo(() => {
    if (filter === 'All' || filter === 'Full Body') return items;
    const keywords = FILTER_MUSCLES[filter] ?? [];
    return items.filter((r) => {
      if (r.name.toLowerCase().includes(filter.toLowerCase())) return true;
      return r.user_routine_exercises.some((rex) => {
        const raw = rex.exercises?.primary_muscles;
        const muscles = (Array.isArray(raw) ? raw.join(' ') : (raw ?? '')).toLowerCase();
        return keywords.some((kw) => muscles.includes(kw));
      });
    });
  }, [items, filter]);

  const handleStartRoutine = (routineId: string) => {
    const routine = items.find((r) => r.id === routineId);
    if (!routine) return;
    reset();
    setWorkoutType(routine.name);
    setStartedAt(new Date().toISOString());
    [...routine.user_routine_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((rex, idx) => {
        upsertExercise({
          exerciseId: rex.exercise_id,
          name: rex.exercises?.name ?? 'Exercise',
          primaryMuscle: rex.exercises?.primary_muscles ?? null,
          orderIndex: idx,
          sets: Array.from({ length: rex.default_sets }, (_, i) => ({
            setNumber: i + 1,
            weight: 0,
            reps: rex.default_reps,
            completed: false,
            isPR: false,
          })),
        });
      });
    router.push(`/(modals)/active-workout?routineId=${routineId}`);
  };

  const routineToSummary = (r: typeof items[number]) => ({
    id: r.id,
    name: r.name,
    exerciseNames: [...r.user_routine_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map((rex) => rex.exercises?.name ?? 'Unknown'),
  });

  const handleDelete = async (routineId: string) => {
    const { error } = await supabase.from('user_routines').delete().eq('id', routineId);
    if (error) {
      Alert.alert('Error', 'Could not delete routine. Please try again.');
    } else {
      refetch();
    }
  };

  const handleMore = (routineId: string) => {
    setSheetRoutineId(routineId);
  };

  const confirmDelete = (routineId: string, name: string) => {
    setSheetRoutineId(null);
    setTimeout(() => {
      Alert.alert(
        'Delete Routine',
        `Delete "${name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(routineId) },
        ]
      );
    }, 350);
  };

  const hasItems = !loading && items.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/*
        Wrap header + chips + section label in a plain View.
        This gives Yoga a single, fully-measured block to lay out before the
        flex:1 ScrollView below — preventing the conditional sectionLabel from
        being pushed below the scroll due to flex space being claimed early.
      */}
      <View>
        {/* Header */}
        <View style={styles.header}>
          <Text style={typography.heading}>Routines</Text>
          <Pressable
            onPress={() => router.push('/(modals)/create-routine')}
            hitSlop={8}
            accessibilityLabel="Create routine"
          >
            <Plus size={22} color={colors.ink2} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {FILTERS.map((chip) => (
            <Chip
              key={chip}
              label={chip}
              selected={filter === chip}
              onPress={() => setFilter(chip)}
            />
          ))}
        </ScrollView>

        {/* Section label — only visible when routines exist */}
        {hasItems ? (
          <Text style={styles.sectionLabel}>
            {filter === 'All'
              ? `MY ROUTINES (${items.length})`
              : `${filter.toUpperCase()} (${filtered.length})`}
          </Text>
        ) : null}
      </View>

      {/* Routine options bottom sheet */}
      <Sheet
        visible={sheetRoutineId !== null}
        onClose={() => setSheetRoutineId(null)}
      >
        <Text style={styles.sheetTitle} numberOfLines={1}>
          {sheetRoutine?.name ?? ''}
        </Text>
        <View style={styles.sheetDivider} />
        <Pressable
          style={styles.sheetRow}
          onPress={() => confirmDelete(sheetRoutineId!, sheetRoutine?.name ?? '')}
        >
          <Trash2 size={20} color={colors.alert} strokeWidth={1.75} />
          <Text style={styles.sheetDestructiveLabel}>Delete Routine</Text>
        </Pressable>
        <View style={[styles.sheetCancelWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            label="Cancel"
            variant="secondary"
            fullWidth
            onPress={() => setSheetRoutineId(null)}
          />
        </View>
      </Sheet>

      {/* Scrollable content — flex:1 starts after the fully-measured header block */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
          !hasItems && styles.scrollContentCenter,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.hint}>Loading routines…</Text>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Dumbbell size={32} color={colors.ink4} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyCaption}>
              Create your first routine to start training with a plan.
            </Text>
            <Button
              label="Create Routine"
              fullWidth
              onPress={() => router.push('/(modals)/create-routine')}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.filterEmptyWrap}>
            <Text style={styles.filterEmptyTitle}>No {filter} routines</Text>
            <Text style={styles.filterEmptyCaption}>
              Try a different filter or create a new routine.
            </Text>
          </View>
        ) : (
          filtered.map((r) => (
            <RoutineCard
              key={r.id}
              routine={routineToSummary(r)}
              onStart={() => handleStartRoutine(r.id)}
              onMore={() => handleMore(r.id)}
            />
          ))
        )}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  } satisfies ViewStyle,
  filtersScroll: { height: 52 } satisfies ViewStyle,
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  } satisfies ViewStyle,
  sectionLabel: {
    ...(typography.label as TextStyle),
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  } satisfies TextStyle,
  scroll: { flex: 1 } satisfies ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xs,
    rowGap: spacing.md,
  } satisfies ViewStyle,
  scrollContentCenter: {
    flexGrow: 1,
    justifyContent: 'center',
  } satisfies ViewStyle,
  hint: { ...(typography.body as TextStyle), color: colors.ink3 } satisfies TextStyle,
  emptyWrap: { alignItems: 'center', paddingHorizontal: spacing.xl } satisfies ViewStyle,
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  } satisfies ViewStyle,
  emptyTitle: {
    ...(typography.subheading as TextStyle),
    marginBottom: spacing.xs,
  } satisfies TextStyle,
  emptyCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  } satisfies TextStyle,
  filterEmptyWrap: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
  } satisfies ViewStyle,
  filterEmptyTitle: {
    ...(typography.subheading as TextStyle),
    marginBottom: spacing.xs,
  } satisfies TextStyle,
  filterEmptyCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
  } satisfies TextStyle,
  // Bottom sheet content
  sheetTitle: {
    ...(typography.subheading as TextStyle),
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
  } satisfies TextStyle,
  sheetDivider: {
    height: 1,
    backgroundColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  } satisfies ViewStyle,
  sheetDestructiveLabel: {
    ...(typography.body as TextStyle),
    color: colors.alert,
  } satisfies TextStyle,
  sheetCancelWrap: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  } satisfies ViewStyle,
});
