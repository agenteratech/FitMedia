import { supabase } from '../supabase';

export type SleepQuality = 'good' | 'okay' | 'poor';

export interface SaveSleepLogParams {
  userId: string;
  date: string;
  hours: number;
  quality: SleepQuality;
}

/**
 * Upsert a sleep_logs row.
 * Extracted from app/add/sleep/index.tsx so both the old screen
 * and the new inline LogSleepSheet can share the same save logic.
 */
export async function saveSleepLog(params: SaveSleepLogParams): Promise<{ error: string | null }> {
  const { error } = await supabase.from('sleep_logs').upsert({
    user_id: params.userId,
    date: params.date,
    hours: params.hours,
    quality: params.quality,
  });
  return { error: error?.message ?? null };
}
