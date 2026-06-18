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
    setError(null);

    // ── Step 1: fetch routines ──────────────────────────────────────────────
    const { data: routineRows, error: routineErr } = await supabase
      .from('user_routines')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (routineErr) {
      setLoading(false);
      setError(routineErr.message);
      return;
    }
    if (!routineRows?.length) {
      setLoading(false);
      setItems([]);
      return;
    }

    const routineIds = routineRows.map((r) => r.id);

    // ── Step 2: fetch routine exercises ────────────────────────────────────
    const { data: rexRows, error: rexErr } = await supabase
      .from('user_routine_exercises')
      .select('id, routine_id, exercise_id, order_index, default_sets, default_reps')
      .in('routine_id', routineIds);

    if (rexErr) {
      setLoading(false);
      setError(rexErr.message);
      return;
    }

    // ── Step 3: fetch exercise details for all referenced exercise IDs ─────
    const exerciseIds = [...new Set((rexRows ?? []).map((r) => r.exercise_id))];
    let exerciseMap: Record<string, { name: string; primary_muscles: string | string[] | null }> = {};

    if (exerciseIds.length > 0) {
      const { data: exRows } = await supabase
        .from('exercises')
        .select('id, name, primary_muscles')
        .in('id', exerciseIds);

      exerciseMap = Object.fromEntries(
        (exRows ?? []).map((ex) => [ex.id, { name: ex.name, primary_muscles: ex.primary_muscles }]),
      );
    }

    // ── Step 4: merge ──────────────────────────────────────────────────────
    const merged: RoutineItem[] = routineRows.map((routine) => ({
      id: routine.id,
      name: routine.name,
      created_at: routine.created_at,
      user_routine_exercises: (rexRows ?? [])
        .filter((rex) => rex.routine_id === routine.id)
        .map((rex) => ({
          id: rex.id,
          exercise_id: rex.exercise_id,
          order_index: rex.order_index,
          default_sets: rex.default_sets,
          default_reps: rex.default_reps,
          exercises: exerciseMap[rex.exercise_id] ?? null,
        })),
    }));

    setLoading(false);
    setItems(merged);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, error, refetch: fetch };
}
