import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface LeaderboardEntry {
  userId:        string;
  displayName:   string;
  currentStreak: number;
  longestStreak: number;
  rank:          number;
  isCurrentUser: boolean;
}

export interface LeaderboardResult {
  entries:     LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;  // null if user is already in top entries
  loading:     boolean;
  error:       string | null;
  refresh:     () => void;
}

export function useLeaderboard(limit = 50): LeaderboardResult {
  const { user } = useAuthStore();
  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch top N by current_streak desc, longest_streak desc as tiebreaker.
    const { data, error: fetchErr } = await supabase
      .from('user_streaks')
      .select('user_id, display_name, current_streak, longest_streak')
      .order('current_streak', { ascending: false })
      .order('longest_streak', { ascending: false })
      .limit(limit);

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const mapped: LeaderboardEntry[] = rows.map((row, idx) => ({
      userId:        row.user_id,
      displayName:   row.display_name || 'Anonymous',
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      rank:          idx + 1,
      isCurrentUser: row.user_id === user?.id,
    }));

    setEntries(mapped);

    // If current user is not in the top list, fetch their specific rank.
    const userInList = mapped.find(e => e.isCurrentUser);
    if (!userInList && user) {
      // Count how many users have a higher current_streak (or equal + longer longest)
      const { count } = await supabase
        .from('user_streaks')
        .select('*', { count: 'exact', head: true })
        .or(`current_streak.gt.${0},current_streak.eq.${0}`)  // fetch own row for rank calc
        .eq('user_id', user.id);

      // Also get own row
      const { data: ownRow } = await supabase
        .from('user_streaks')
        .select('display_name, current_streak, longest_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownRow) {
        // Count users ranked above current user
        const { count: aboveCount } = await supabase
          .from('user_streaks')
          .select('*', { count: 'exact', head: true })
          .gt('current_streak', ownRow.current_streak);

        setCurrentUser({
          userId:        user.id,
          displayName:   ownRow.display_name || 'Anonymous',
          currentStreak: ownRow.current_streak,
          longestStreak: ownRow.longest_streak,
          rank:          (aboveCount ?? 0) + 1,
          isCurrentUser: true,
        });
      }
    } else {
      setCurrentUser(null);
    }

    setLoading(false);
  }, [user, limit]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Subscribe to any change on user_streaks so the list updates live.
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_streaks' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboard]);

  return { entries, currentUser, loading, error, refresh: fetchLeaderboard };
}
