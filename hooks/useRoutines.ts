import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type RoutineExerciseItem = {
  id: string;
  exercise_id: string;
  order_index: number;
  default_sets: number;
  default_reps: number;
  exercises: { name: string; primary_muscles: string | string[] | null } | null;
};

export type RoutineItem = {
  id: string;
  name: string;
  created_at: string;
  user_routine_exercises: RoutineExerciseItem[];
};

export function useRoutines() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('user_routines')
      .select(`
        id, name, created_at,
        user_routine_exercises(
          id, exercise_id, order_index, default_sets, default_reps,
          exercises(name, primary_muscles)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setItems((data as RoutineItem[]) ?? []);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, error, refetch: fetch };
}
