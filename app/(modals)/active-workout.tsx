import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Plus, Dumbbell, Sparkles } from 'lucide-react-native';
import { useWorkoutStore } from '../../stores/workoutStore';
import type { WorkoutExerciseEntry } from '../../stores/workoutStore';
import { useAuthStore } from '../../stores/authStore';
import { useAutoFill } from '../../hooks/useAutoFill';
import { usePRDetection } from '../../hooks/usePRDetection';
import {
  ExerciseCard,
  TimerIsland,
  Button,
  useSnackBar,
} from '../../src/components/primitives';
import type { SetDraft, ExerciseDraft } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

// ── helpers ────────────────────────────────────────────────────────────────
function applyActiveFlag(arr: SetDraft[]): SetDraft[] {
  const firstIncomplete = arr.findIndex((s) => !s.isDone);
  return arr.map((s, i) => ({ ...s, isActive: i === firstIncomplete }));
}

// ── ActiveExerciseCard ──────────────────────────────────────────────────────
// One instance per exercise. Owns per-exercise hooks (useAutoFill,
// usePRDetection). Does NOT subscribe to useWorkoutStore — it reads/writes the
// store imperatively via getState() to avoid triggering a parent re-render
// while this component is still rendering (React New Architecture constraint).
function ActiveExerciseCard({
  entry,
  userId,
  onSetCompleted,
}: {
  entry: WorkoutExerciseEntry;
  userId: string;
  onSetCompleted: (exerciseName: string, setLabel: string) => void;
}) {
  const { sets: fillSets } = useAutoFill(entry.exerciseId, userId);
  const { checkPR } = usePRDetection(entry.exerciseId, userId);
  const { show: showSnack } = useSnackBar();

  // Refs so callbacks always see the latest values without re-creating
  const entryRef = useRef(entry);
  useEffect(() => { entryRef.current = entry; }, [entry]);

  const [drafts, setDrafts] = useState<SetDraft[]>(() => {
    if (entry.sets.length > 0) {
      return entry.sets.map((s, i) => ({
        kg: s.weight > 0 ? String(s.weight) : '',
        reps: s.reps > 0 ? String(s.reps) : '',
        isDone: s.completed ?? false,
        isActive:
          !s.completed &&
          entry.sets.slice(0, i).every((p) => p.completed),
        isPR: s.isPR ?? false,
      }));
    }
    return [
      { kg: '', reps: '', isDone: false, isActive: true, isPR: false },
      { kg: '', reps: '', isDone: false, isActive: false, isPR: false },
      { kg: '', reps: '', isDone: false, isActive: false, isPR: false },
    ];
  });

  const draftsRef = useRef(drafts);
  useEffect(() => { draftsRef.current = drafts; }, [drafts]);

  // Autofill from previous session (pure updater — no side effects inside)
  const fillApplied = useRef(false);
  useEffect(() => {
    if (fillApplied.current || fillSets.length === 0) return;
    fillApplied.current = true;
    setDrafts((prev) =>
      prev.map((d, i) => {
        const fill = fillSets[i];
        if (!fill) return d;
        return {
          ...d,
          kg: d.kg || String(fill.weightKg),
          reps: d.reps || String(fill.reps),
          previous: { kg: fill.weightKg, reps: fill.reps },
        };
      })
    );
  }, [fillSets]);

  // Imperative write to store — no React subscription, no re-render side-effect
  const syncToStore = useCallback((next: SetDraft[]) => {
    useWorkoutStore.getState().upsertExercise({
      ...entryRef.current,
      sets: next.map((d, i) => ({
        setNumber: i + 1,
        weight: parseFloat(d.kg) || 0,
        reps: parseInt(d.reps, 10) || 0,
        isPR: d.isPR,
        completed: d.isDone,
      })),
    });
  }, []); // stable — uses ref

  // All handlers: compute next state first, then setDrafts + syncToStore separately.
  // Never call syncToStore inside a setDrafts functional updater (forbidden in New Arch).
  const handleUpdateSet = useCallback(
    async (index: number, patch: Partial<SetDraft>) => {
      const current = draftsRef.current;
      const merged = { ...current[index], ...patch };
      const withActive = applyActiveFlag(current.map((d, i) => (i === index ? merged : d)));

      setDrafts(withActive);
      syncToStore(withActive);

      if (patch.isDone === true) {
        // Start rest timer on every set completion
        onSetCompleted(entryRef.current.name, `Set ${index + 1}`);

        // PR check only when weight + reps are present
        const kg = parseFloat(merged.kg) || 0;
        const reps = parseInt(merged.reps, 10) || 0;
        if (kg > 0 && reps > 0) {
          const { isPR } = await checkPR(kg, reps);
          if (isPR) {
            const prUpdated = draftsRef.current.map((d, i) =>
              i === index ? { ...d, isPR: true } : d
            );
            setDrafts(prUpdated);
            syncToStore(prUpdated);
            showSnack(`New PR — ${kg} kg × ${reps}`, { icon: Sparkles });
          }
        }
      }
    },
    [checkPR, onSetCompleted, showSnack, syncToStore]
  );

  const handleAddSet = useCallback(() => {
    const current = draftsRef.current;
    const last = current[current.length - 1];
    const next = [
      ...current,
      {
        kg: last?.kg ?? '',
        reps: last?.reps ?? '',
        isDone: false,
        isActive: current.every((s) => s.isDone),
        isPR: false,
        previous: last?.previous,
      },
    ];
    setDrafts(next);
    syncToStore(next);
  }, [syncToStore]);

  const handleRemoveSet = useCallback(
    (index: number) => {
      const next = applyActiveFlag(draftsRef.current.filter((_, i) => i !== index));
      setDrafts(next);
      syncToStore(next);
    },
    [syncToStore]
  );

  const exerciseDraft: ExerciseDraft = { id: entry.exerciseId, name: entry.name };

  return (
    <ExerciseCard
      exercise={exerciseDraft}
      sets={drafts}
      showPrevious
      onAddSet={handleAddSet}
      onUpdateSet={handleUpdateSet}
      onRemoveSet={handleRemoveSet}
    />
  );
}

// ── ActiveWorkoutScreen ────────────────────────────────────────────────────
type TimerState = {
  timeRemaining: number;
  totalTime: number;
  isPaused: boolean;
  exerciseLabel: string;
  setLabel: string;
};

function formatElapsed(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ routineId?: string; mode?: string }>();
  const { user } = useAuthStore();
  const { exercises, workoutType, startedAt, reset, setWorkoutType, setStartedAt } =
    useWorkoutStore();

  // Initialize freestyle workout if store is empty
  useEffect(() => {
    if (mode === 'freestyle' && exercises.length === 0) {
      reset();
      setWorkoutType('Workout');
      setStartedAt(new Date().toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed time counter
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(
        startedAt
          ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
          : 0
      );
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Rest timer
  const [timer, setTimer] = useState<TimerState | null>(null);

  useEffect(() => {
    if (!timer || timer.isPaused) return;
    const id = setInterval(() => {
      setTimer((t) => {
        if (!t || t.isPaused) return t;
        if (t.timeRemaining <= 1) return null;
        return { ...t, timeRemaining: t.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timer?.isPaused, !!timer]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetCompleted = useCallback(
    (exerciseName: string, setLabel: string) => {
      setTimer({
        timeRemaining: 90,
        totalTime: 90,
        isPaused: false,
        exerciseLabel: exerciseName,
        setLabel,
      });
    },
    []
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Sticky header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronDown size={24} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workoutType}
          </Text>
          <Text style={[styles.headerTime, numericStyle]}>{formatElapsed(elapsed)}</Text>
        </View>
        <Button
          label="Finish"
          size="compact"
          onPress={() => router.push('/(modals)/finish-workout')}
        />
      </View>

      {/* Content area — explicit containing block for the floating timer island */}
      <View style={styles.contentArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: timer ? insets.bottom + 160 : insets.bottom + 80 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {exercises.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Dumbbell size={32} color={colors.ink4} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptyCaption}>Add an exercise to get started.</Text>
              <Button
                label="Add Exercise"
                fullWidth
                onPress={() => router.push('/(modals)/exercise-picker?target=draft')}
                style={{ marginTop: spacing.lg }}
              />
            </View>
          ) : (
            <>
              {exercises.map((entry) => (
                <ActiveExerciseCard
                  key={entry.exerciseId}
                  entry={entry}
                  userId={user?.id ?? ''}
                  onSetCompleted={handleSetCompleted}
                />
              ))}
              <Button
                label="Add Exercise"
                variant="secondary"
                fullWidth
                icon={Plus}
                onPress={() => router.push('/(modals)/exercise-picker?target=draft')}
              />
            </>
          )}
        </ScrollView>

        {/* Rest timer island — floats above scroll content */}
        {timer ? (
          <TimerIsland
            timeRemaining={timer.timeRemaining}
            totalTime={timer.totalTime}
            isPaused={timer.isPaused}
            exerciseLabel={timer.exerciseLabel}
            setLabel={timer.setLabel}
            onPause={() =>
              setTimer((t) => (t ? { ...t, isPaused: !t.isPaused } : null))
            }
            onSkip={() => setTimer(null)}
            onAddTime={(delta) =>
              setTimer((t) =>
                t ? { ...t, timeRemaining: Math.max(0, t.timeRemaining + delta) } : null
              )
            }
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  } satisfies ViewStyle,
  headerCenter: { flex: 1, alignItems: 'center' } satisfies ViewStyle,
  headerTitle: {
    ...(typography.subheading as TextStyle),
    textAlign: 'center',
  } satisfies TextStyle,
  headerTime: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 1,
  } satisfies TextStyle,
  contentArea: { flex: 1 } satisfies ViewStyle,
  scroll: { flex: 1 } satisfies ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    gap: spacing.md,
  } satisfies ViewStyle,
  emptyWrap: { alignItems: 'center', paddingTop: spacing['4xl'] } satisfies ViewStyle,
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
  } satisfies TextStyle,
});
