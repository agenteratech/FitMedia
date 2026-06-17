import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface StreakResult {
  current: number;       // active session streak (0 if broken)
  longest: number;       // all-time best session streak
  lastWorkoutDate: string | null;
  loading: boolean;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function daysBetween(isoA: string, isoB: string): number {
  return Math.round(
    Math.abs(new Date(isoB).getTime() - new Date(isoA).getTime()) / 86_400_000,
  );
}

/**
 * Infer the maximum rest-day gap that is part of the user's normal schedule.
 * Uses the 90th-percentile gap so that the longest regular rest block
 * (e.g., 2-day weekend for a 5-2 split, 1-day break for 3-1 split) is
 * captured, while true outlier gaps (vacations, injuries) remain above it.
 *
 * Floor: 2  — daily trainers get a 1-day grace before streak breaks.
 * Ceiling: 4 — prevents very irregular schedules from never breaking.
 */
function inferAllowedGap(gaps: number[]): number {
  if (gaps.length < 4) return 2; // too little data — safe default
  const sorted = [...gaps].sort((a, b) => a - b);
  const idx = Math.min(Math.floor(sorted.length * 0.9), sorted.length - 1);
  return Math.max(2, Math.min(4, sorted[idx]));
}

/**
 * Core streak engine.
 *
 * workoutDates: array of ISO date strings (YYYY-MM-DD), may have duplicates.
 *
 * A streak is the count of consecutive *workout sessions* (unique calendar days)
 * where no gap between adjacent sessions exceeds the user's inferred allowed gap.
 * This handles every split pattern naturally:
 *   3-1 split  → typical gaps [1,1,2] → allowed 2
 *   5-2 split  → typical gaps [1,1,1,1,3] → allowed 3
 *   EOD        → typical gaps [2] → allowed 2
 *   Daily      → typical gaps [1] → allowed 2 (floor)
 */
function computeStreak(workoutDates: string[]): Omit<StreakResult, 'loading'> {
  const today = new Date().toISOString().slice(0, 10);

  if (workoutDates.length === 0) {
    return { current: 0, longest: 0, lastWorkoutDate: null };
  }

  // Deduplicate and sort ascending
  const dates = [...new Set(workoutDates)].sort();

  if (dates.length === 1) {
    const alive = daysBetween(dates[0], today) <= 2;
    return { current: alive ? 1 : 0, longest: 1, lastWorkoutDate: dates[0] };
  }

  // Gaps between consecutive unique workout days
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push(daysBetween(dates[i - 1], dates[i]));
  }

  const allowedGap = inferAllowedGap(gaps);

  // Walk forward through dates, splitting into streak runs at each gap break
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < dates.length; i++) {
    if (gaps[i - 1] <= allowedGap) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      currentRun = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentRun);

  // Streak is alive only if the user is still within their allowed rest window
  const lastDate = dates[dates.length - 1];
  const daysSinceLast = daysBetween(lastDate, today);
  const currentStreak = daysSinceLast <= allowedGap ? currentRun : 0;

  return { current: currentStreak, longest: longestStreak, lastWorkoutDate: lastDate };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStreak(): StreakResult {
  const { user } = useAuthStore();
  const [result, setResult] = useState<StreakResult>({
    current: 0,
    longest: 0,
    lastWorkoutDate: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setResult({ current: 0, longest: 0, lastWorkoutDate: null, loading: false });
      return;
    }

    let cancelled = false;

    const run = async () => {
      // 180 days gives enough history to detect any weekly/biweekly pattern
      const since = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);

      const [workoutsRes, profileRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', since)
          .order('completed_at', { ascending: true }),
        supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (workoutsRes.error || !workoutsRes.data) {
        setResult(r => ({ ...r, loading: false }));
        return;
      }

      const dates = workoutsRes.data.map((w: { completed_at: string }) => w.completed_at.slice(0, 10));
      const streak = computeStreak(dates);

      setResult({ ...streak, loading: false });

      // Sync to public leaderboard table (fire-and-forget).
      const displayName =
        profileRes.data?.name?.trim() ||
        user.email?.split('@')[0] ||
        'Anonymous';

      supabase
        .from('user_streaks')
        .upsert(
          {
            user_id:        user.id,
            display_name:   displayName,
            current_streak: streak.current,
            longest_streak: streak.longest,
            updated_at:     new Date().toISOString(),
          } as any,
          { onConflict: 'user_id' } as any,
        )
        .then(({ error }) => {
          if (error) console.warn('[useStreak] leaderboard sync failed:', error.message);
        });
    };

    run();
    return () => { cancelled = true; };
  }, [user]);

  return result;
}
