import { supabase } from './supabase';

// Calls the calculate-scores Edge Function and returns the updated scores.
// Call this after saving a workout, diet log, or sleep log so the home screen
// reflects the latest state immediately.
export async function recalculateScores(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase.functions.invoke('calculate-scores', {
    body: {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    console.error('[scoreEngine] recalculateScores:', error);
    throw error;
  }
}
