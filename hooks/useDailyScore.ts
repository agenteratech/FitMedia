import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { getJSON, setJSON, storageKeys } from '../lib/storage';

export type DailyScore = {
  date: string;
  total_score: number;
  workout_score: number;
  diet_score: number;
  sleep_score: number;
  balance_score: number;
  body_part_scores: Record<string, number>;
  insights: { type: string; message: string }[];
};

export function useDailyScore() {
  const { user } = useAuthStore();
  const [score, setScore] = useState<DailyScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!user) {
      setScore(null);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = storageKeys.dailyScore(user.id, today);
    const cached = getJSON<DailyScore>(cacheKey);
    if (cached) setScore(cached);

    setLoading(true);
    setError(null);

    const { data, error: fetchErr } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    setScore(data as unknown as DailyScore);
    setJSON(cacheKey, data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  // Call after saving a workout / diet log / sleep log to show updated scores.
  const refresh = useCallback(() => fetchScore(), [fetchScore]);

  return { score, loading, error, refresh };
}
