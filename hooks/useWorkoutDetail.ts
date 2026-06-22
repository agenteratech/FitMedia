import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type WorkoutDetailSet = {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  is_pr: boolean;
};

export type WorkoutDetailExercise = {
  id: string;
  exercise_id: string | null;
  exercise_name: string;
  exercise_target: string | string[] | null;
  order_index: number;
  workout_sets: WorkoutDetailSet[];
};

export type WorkoutDetail = {
  id: string;
  workout_type: string;
  completed_at: string;
  started_at: string | null;
  duration_minutes: number | null;
  total_volume_kg: number;
  total_sets: number;
  total_exercises: number;
  score_earned: number;
  workout_exercises: WorkoutDetailExercise[];
};

const QUERY_FIELDS = `
  id, workout_type, completed_at, started_at, duration_minutes,
  total_volume_kg, total_sets, total_exercises, score_earned,
  workout_exercises(
    id, exercise_id, exercise_name, exercise_target, order_index,
    workout_sets(id, set_number, weight_kg, reps, is_pr)
  )
`.trim();

/**
 * Fetches a single workout with its full exercise + set breakdown.
 * Powers the workout-detail screen.
 */
export function useWorkoutDetail(workoutId?: string) {
  const { user } = useAuthStore();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !workoutId) {
      setWorkout(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(QUERY_FIELDS)
        .eq('id', workoutId)
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setWorkout(null);
      } else {
        const detail = ((data ?? null) as unknown) as WorkoutDetail | null;
        if (detail) {
          detail.workout_exercises.sort((a, b) => a.order_index - b.order_index);
        }
        setWorkout(detail);
      }
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [user, workoutId]);

  return { workout, loading, error };
}
