import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type ExerciseHistorySet = {
  setNumber: number;
  weightKg: number;
  reps: number;
  isPr: boolean;
};

export type ExerciseSession = {
  workoutId: string;
  date: string;            // completed_at ISO timestamp
  sets: ExerciseHistorySet[];
  topWeightKg: number;     // heaviest set in the session
  topReps: number;         // reps at the heaviest set
  totalVolumeKg: number;   // Σ weight × reps
  totalReps: number;
};

export type ExerciseHistory = {
  sessions: ExerciseSession[];   // newest first
  bestWeightKg: number;          // all-time heaviest set
  bestVolumeKg: number;          // all-time best session volume
  sessionCount: number;
};

type SetRow = {
  set_number: number;
  weight_kg: number;
  reps: number;
  is_pr: boolean;
  workout_exercises: {
    workouts: { id: string; completed_at: string };
  } | null;
};

/**
 * Fetches every logged session for a single exercise (matched by exercise_id),
 * grouped by workout and ordered newest-first. Powers the exercise-history screen
 * and the active-workout progressive-overload comparison.
 *
 * Custom exercises (synthetic, non-UUID ids) are stored with a null exercise_id,
 * so they have no cross-session history — the hook returns an empty result.
 */
export function useExerciseHistory(exerciseId?: string) {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !exerciseId) {
      setHistory(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select(
          `set_number, weight_kg, reps, is_pr,
          workout_exercises!inner(
            exercise_id,
            workouts!inner(id, user_id, completed_at)
          )`
        )
        .eq('workout_exercises.exercise_id', exerciseId)
        .eq('workout_exercises.workouts.user_id', user.id)
        .eq('is_completed', true)
        .order('completed_at', { foreignTable: 'workout_exercises.workouts', ascending: false })
        .order('set_number', { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setHistory(null);
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as unknown) as SetRow[];

      // Group sets by their workout (one session per workout).
      const byWorkout = new Map<string, ExerciseSession>();
      for (const row of rows) {
        const w = row.workout_exercises?.workouts;
        if (!w) continue;

        let session = byWorkout.get(w.id);
        if (!session) {
          session = {
            workoutId: w.id,
            date: w.completed_at,
            sets: [],
            topWeightKg: 0,
            topReps: 0,
            totalVolumeKg: 0,
            totalReps: 0,
          };
          byWorkout.set(w.id, session);
        }

        session.sets.push({
          setNumber: row.set_number,
          weightKg: row.weight_kg,
          reps: row.reps,
          isPr: row.is_pr,
        });
        session.totalVolumeKg += row.weight_kg * row.reps;
        session.totalReps += row.reps;
        if (
          row.weight_kg > session.topWeightKg ||
          (row.weight_kg === session.topWeightKg && row.reps > session.topReps)
        ) {
          session.topWeightKg = row.weight_kg;
          session.topReps = row.reps;
        }
      }

      const sessions = Array.from(byWorkout.values()).sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      );
      const bestWeightKg = sessions.reduce((m, s) => Math.max(m, s.topWeightKg), 0);
      const bestVolumeKg = sessions.reduce((m, s) => Math.max(m, s.totalVolumeKg), 0);

      setHistory({ sessions, bestWeightKg, bestVolumeKg, sessionCount: sessions.length });
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [user, exerciseId]);

  return { history, loading, error };
}
