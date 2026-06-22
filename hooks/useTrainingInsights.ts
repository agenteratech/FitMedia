import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { muscleGroupLabel } from '../lib/workouts/muscles';

export type TrainingInsight = {
  id: string;
  scope: 'overall' | 'muscle' | 'exercise';
  direction: 'up' | 'down';
  message: string;
  pct: number; // signed % change — used for ranking
};

type SetRow = {
  weight_kg: number;
  reps: number;
  is_completed: boolean;
  workout_exercises: {
    exercise_name: string;
    exercise_target: string | string[] | null;
    workouts: { completed_at: string } | null;
  } | null;
};

type Bucket = { curr: number; prev: number };

function bump(map: Map<string, Bucket>, key: string, vol: number, isCurrent: boolean) {
  let b = map.get(key);
  if (!b) { b = { curr: 0, prev: 0 }; map.set(key, b); }
  if (isCurrent) b.curr += vol;
  else b.prev += vol;
}

function pctChange(curr: number, prev: number): number {
  if (prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * Derives performance insights by comparing the selected window against the
 * immediately-preceding window of equal length:
 *   • overall training volume change
 *   • per-muscle-group volume change ("Back training volume increased 18%")
 *   • per-exercise volume change ("Bench Press volume increased 12% this period")
 *
 * Pure derivation from logged sets — no extra services. Returns the most
 * significant insights, ranked by magnitude.
 */
export function useTrainingInsights(since: string, periodNoun: string) {
  const { user } = useAuthStore();
  const [insights, setInsights] = useState<TrainingInsight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setInsights([]); return; }
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const sinceIso = since + 'T00:00:00.000Z';
      const sinceMs = new Date(sinceIso).getTime();
      const windowMs = Math.max(Date.now() - sinceMs, 24 * 60 * 60 * 1000);
      const prevStartIso = new Date(sinceMs - windowMs).toISOString();

      const { data, error } = await supabase
        .from('workout_sets')
        .select(
          `weight_kg, reps, is_completed,
          workout_exercises!inner(
            exercise_name, exercise_target,
            workouts!inner(user_id, completed_at)
          )`
        )
        .eq('workout_exercises.workouts.user_id', user.id)
        .eq('is_completed', true)
        .gte('workout_exercises.workouts.completed_at', prevStartIso);

      if (cancelled) return;
      if (error) { setInsights([]); setLoading(false); return; }

      const rows = ((data ?? []) as unknown) as SetRow[];

      const overall: Bucket = { curr: 0, prev: 0 };
      const byMuscle = new Map<string, Bucket>();
      const byExercise = new Map<string, Bucket>();

      for (const row of rows) {
        const completedAt = row.workout_exercises?.workouts?.completed_at;
        if (!completedAt) continue;
        const vol = (row.weight_kg || 0) * (row.reps || 0);
        if (vol <= 0) continue;
        const isCurrent = completedAt >= sinceIso;

        if (isCurrent) overall.curr += vol;
        else overall.prev += vol;

        const muscle = muscleGroupLabel(row.workout_exercises?.exercise_target);
        if (muscle) bump(byMuscle, muscle, vol, isCurrent);

        const name = row.workout_exercises?.exercise_name;
        if (name) bump(byExercise, name, vol, isCurrent);
      }

      const out: TrainingInsight[] = [];

      // Overall — needs a meaningful prior window and ≥5% move.
      const overallPct = pctChange(overall.curr, overall.prev);
      if (overall.prev > 0 && overall.curr > 0 && Math.abs(overallPct) >= 5) {
        out.push({
          id: 'overall',
          scope: 'overall',
          direction: overallPct >= 0 ? 'up' : 'down',
          pct: overallPct,
          message: `Total training volume ${overallPct >= 0 ? 'up' : 'down'} ${Math.abs(overallPct)}% vs the previous ${periodNoun}.`,
        });
      }

      // Per muscle group — top 2 by magnitude, ≥8% move, data in both windows.
      const muscleInsights: TrainingInsight[] = [];
      byMuscle.forEach((b, label) => {
        const pct = pctChange(b.curr, b.prev);
        if (b.prev > 0 && b.curr > 0 && Math.abs(pct) >= 8) {
          muscleInsights.push({
            id: `muscle:${label}`,
            scope: 'muscle',
            direction: pct >= 0 ? 'up' : 'down',
            pct,
            message: `${label} training volume ${pct >= 0 ? 'increased' : 'decreased'} ${Math.abs(pct)}%.`,
          });
        }
      });
      muscleInsights.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
      out.push(...muscleInsights.slice(0, 2));

      // Per exercise — top 3 by magnitude, ≥10% move, data in both windows.
      const exerciseInsights: TrainingInsight[] = [];
      byExercise.forEach((b, name) => {
        const pct = pctChange(b.curr, b.prev);
        if (b.prev > 0 && b.curr > 0 && Math.abs(pct) >= 10) {
          exerciseInsights.push({
            id: `exercise:${name}`,
            scope: 'exercise',
            direction: pct >= 0 ? 'up' : 'down',
            pct,
            message: `${name} volume ${pct >= 0 ? 'increased' : 'decreased'} ${Math.abs(pct)}% this ${periodNoun}.`,
          });
        }
      });
      exerciseInsights.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
      out.push(...exerciseInsights.slice(0, 3));

      setInsights(out.slice(0, 6));
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [user, since, periodNoun]);

  return { insights, loading };
}
