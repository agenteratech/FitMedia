import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type BodyPartHitLevel = 'high' | 'medium' | 'low';

export type WorkoutLog = {
  id: string;
  workout_type: string;
  completed_at: string;
  duration_minutes: number | null;
  total_volume_kg: number;
  total_sets: number;
  total_exercises: number;
  score_earned: number;
  body_parts_hit: Record<string, BodyPartHitLevel> | null;
  workout_exercises: {
    id: string;
    exercise_name: string;
    exercise_target: string | string[] | null;
    workout_sets: {
      id: string;
      set_number: number;
      weight_kg: number;
      reps: number;
      is_pr: boolean;
    }[];
  }[];
};

const PAGE_SIZE = 20;

const QUERY_FIELDS = `
  id, workout_type, completed_at, duration_minutes,
  total_volume_kg, total_sets, total_exercises, score_earned,
  body_parts_hit,
  workout_exercises(
    id, exercise_name, exercise_target,
    workout_sets(id, set_number, weight_kg, reps, is_pr)
  )
`.trim();

export function useWorkoutHistory() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const currentPage = useRef(0);

  const fetchPage = async (page: number, append: boolean) => {
    if (!user) return;

    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }

    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('workouts')
      .select(QUERY_FIELDS)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .range(from, to);

    if (error) {
      setError(error.message);
      if (append) setLoadingMore(false);
      else setLoading(false);
      return;
    }

    const page_data = (data ?? []) as WorkoutLog[];
    setItems((prev) => append ? [...prev, ...page_data] : page_data);
    setHasMore(page_data.length === PAGE_SIZE);
    currentPage.current = page;

    if (append) setLoadingMore(false);
    else setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      setHasMore(true);
      return;
    }
    currentPage.current = 0;
    setHasMore(true);
    fetchPage(0, false);
  }, [user]);

  const loadMore = () => {
    if (loadingMore || loading || !hasMore) return;
    fetchPage(currentPage.current + 1, true);
  };

  return { items, loading, loadingMore, hasMore, error, loadMore };
}
