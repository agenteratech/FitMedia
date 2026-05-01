import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type ProgressStats = {
  sessions: number;
  totalVolumeKg: number;
  prCount: number;
  avgSleepHours: number | null;
  sleepNights: number;
};

const EMPTY: ProgressStats = {
  sessions: 0,
  totalVolumeKg: 0,
  prCount: 0,
  avgSleepHours: null,
  sleepNights: 0,
};

export function useProgressStats(since: string) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ProgressStats>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) { setStats(EMPTY); return; }
      setLoading(true);

      const [workoutsRes, sleepRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('id, total_volume_kg, workout_exercises(workout_sets(is_pr))')
          .eq('user_id', user.id)
          .gte('completed_at', since + 'T00:00:00.000Z'),
        supabase
          .from('sleep_logs')
          .select('hours')
          .eq('user_id', user.id)
          .gte('date', since),
      ]);

      if (cancelled) return;

      const workouts = ((workoutsRes.data ?? []) as unknown) as {
        id: string;
        total_volume_kg: number;
        workout_exercises: { workout_sets: { is_pr: boolean }[] }[];
      }[];

      const sleepLogs = (sleepRes.data ?? []) as { hours: number }[];

      const sessions = workouts.length;
      const totalVolumeKg = workouts.reduce((s, w) => s + (w.total_volume_kg ?? 0), 0);
      const prCount = workouts.reduce(
        (sum, w) =>
          sum +
          (w.workout_exercises ?? []).reduce(
            (es, e) => es + (e.workout_sets ?? []).filter((s) => s.is_pr).length,
            0,
          ),
        0,
      );

      const sleepNights = sleepLogs.length;
      const avgSleepHours =
        sleepNights > 0
          ? sleepLogs.reduce((s, l) => s + (l.hours ?? 0), 0) / sleepNights
          : null;

      setStats({ sessions, totalVolumeKg, prCount, avgSleepHours, sleepNights });
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [user, since]);

  return { stats, loading };
}
