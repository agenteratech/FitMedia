import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type DietLog = {
  id: string;
  meal_type: string | null;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  created_at: string;
};

const todayYMD = () => new Date().toISOString().slice(0, 10);

export function useDietLogs(date?: string) {
  const { user } = useAuthStore();
  const targetDate = date ?? todayYMD();
  const [items, setItems] = useState<DietLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('diet_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as DietLog[]);
    setLoading(false);
  }, [user, targetDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { items, loading, error, refetch: fetchLogs };
}
