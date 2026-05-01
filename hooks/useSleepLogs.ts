import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type SleepLog = {
  id: string;
  date: string;
  hours: number;
  quality: string | null;
  created_at: string;
};

export function useSleepLogs() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) {
        setItems([]);
        return;
      }

      setLoading(true);
      setError(null);

      const fourteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from('sleep_logs')
        .select('id, date, hours, quality, created_at')
        .eq('user_id', user.id)
        .gte('date', fourteenDaysAgo)
        .order('date', { ascending: false });

      if (error) {
        setError(error.message);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems((data ?? []) as SleepLog[]);
      setLoading(false);
    };

    fetchLogs();
  }, [user]);

  return { items, loading, error };
}
