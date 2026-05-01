import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type AutoFillSet = {
  setNumber: number;
  weightKg: number;
  reps: number;
};

export function useAutoFill(exerciseId?: string, userId?: string) {
  const [sets, setSets] = useState<AutoFillSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastSets = async () => {
      if (!exerciseId || !userId) {
        setSets([]);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workout_sets')
        .select(
          `set_number, weight_kg, reps, workout_exercise_id,
          workout_exercises!inner(
            exercise_id,
            workouts!inner(user_id, completed_at)
          )`
        )
        .eq('workout_exercises.exercise_id', exerciseId)
        .eq('workout_exercises.workouts.user_id', userId)
        .order('completed_at', { foreignTable: 'workout_exercises.workouts', ascending: false })
        .order('set_number', { ascending: true })
        .limit(10);

      if (error) {
        setError(error.message);
        setSets([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setSets([]);
        setLoading(false);
        return;
      }

      const firstWorkoutExerciseId = data[0].workout_exercise_id;
      const latestSets = data
        .filter((row) => row.workout_exercise_id === firstWorkoutExerciseId)
        .map((row) => ({
          setNumber: row.set_number,
          weightKg: row.weight_kg,
          reps: row.reps,
        }));

      setSets(latestSets);
      setLoading(false);
    };

    fetchLastSets();
  }, [exerciseId, userId]);

  return { sets, loading, error };
}
