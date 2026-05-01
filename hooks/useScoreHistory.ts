import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type ScorePoint = {
  date: string;
  total_score: number;
  workout_score: number;
  diet_score: number;
  sleep_score: number;
};

export type ScoreRange = 'Week' | 'Month' | '3 Months' | 'Year';

const RANGE_DAYS: Record<ScoreRange, number> = {
  'Week': 7,
  'Month': 30,
  '3 Months': 90,
  'Year': 365,
};

export function sinceForRange(range: ScoreRange): string {
  const days = RANGE_DAYS[range];
  return new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
}

export function useScoreHistory(range: ScoreRange) {
  const { user } = useAuthStore();
  const [points, setPoints] = useState<ScorePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!user) { setPoints([]); return; }
    setLoading(true);
    setError(null);
    const since = sinceForRange(range);
    const { data, error: err } = await supabase
      .from('daily_scores')
      .select('date, total_score, workout_score, diet_score, sleep_score')
      .eq('user_id', user.id)
      .gte('date', since)
      .order('date', { ascending: true });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setPoints((data ?? []) as ScorePoint[]);
  }, [user, range]);

  useEffect(() => { fetch(); }, [fetch]);

  // Within-period trend: avg of second half vs first half
  const trend = useMemo((): number | null => {
    if (points.length < 4) return null;
    const mid = Math.floor(points.length / 2);
    const firstAvg = points.slice(0, mid).reduce((s, p) => s + p.total_score, 0) / mid;
    const secondAvg = points.slice(mid).reduce((s, p) => s + p.total_score, 0) / (points.length - mid);
    return Math.round(secondAvg - firstAvg);
  }, [points]);

  return { points, trend, loading, error };
}
