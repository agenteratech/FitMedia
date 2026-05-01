import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useExerciseStore } from '../stores/exerciseStore';
import type { Exercise } from '../stores/exerciseStore';

const STALE_MS = 1000 * 60 * 60 * 24 * 7;

export function useExercises(category?: string) {
  const { items: allExercises, setItems: setExercises, updatedAt } = useExerciseStore();
  const [categoryExerciseIds, setCategoryExerciseIds] = useState<Set<string> | null>(null);

  const [loading, setLoading] = useState(allExercises.length === 0);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!category) return allExercises;
    if (categoryExerciseIds) {
      return allExercises.filter((e) => categoryExerciseIds.has(e.id));
    }
    return [];
  }, [allExercises, category, categoryExerciseIds]);

  // Fetch all exercises (cached for 7 days)
  useEffect(() => {
    const fetchExercises = async () => {
      if (allExercises.length > 0 && Date.now() - updatedAt < STALE_MS) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from('exercises').select('*').order('name');

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setExercises(data ?? []);
      setLoading(false);
    };

    fetchExercises();
  }, [allExercises.length, updatedAt, setExercises]);

  // Fetch exercise IDs for the given category via the junction table
  useEffect(() => {
    if (!category) {
      setCategoryExerciseIds(null);
      return;
    }

    supabase
      .from('workout_categories')
      .select('id, workout_category_exercises(exercise_id)')
      .eq('name', category)
      .single()
      .then(({ data }) => {
        if (data?.workout_category_exercises) {
          const ids = new Set(
            (data.workout_category_exercises as { exercise_id: string }[]).map(
              (r) => r.exercise_id,
            ),
          );
          setCategoryExerciseIds(ids);
        }
      });
  }, [category]);

  return { items: filteredItems, loading, error };
}

export type { Exercise };
