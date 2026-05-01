import { useState } from 'react';
import { supabase } from '../lib/supabase';

export type PreviousBest = { weightKg: number; reps: number } | null;
export type PRCheckResult = { isPR: boolean; previousBest: PreviousBest };

export function usePRDetection(exerciseId?: string, userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPR = async (weightKg: number, reps: number): Promise<PRCheckResult> => {
    if (!exerciseId || !userId) return { isPR: false, previousBest: null };

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('personal_records')
      .select('weight_kg, reps')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('weight_kg', { ascending: false })
      .order('reps', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      setError(error.message);
      setLoading(false);
      return { isPR: false, previousBest: null };
    }

    if (!data) {
      setLoading(false);
      return { isPR: true, previousBest: null };
    }

    const isPR = weightKg > data.weight_kg || (weightKg === data.weight_kg && reps > data.reps);
    setLoading(false);
    return {
      isPR,
      previousBest: { weightKg: data.weight_kg, reps: data.reps },
    };
  };

  return { checkPR, loading, error };
}
