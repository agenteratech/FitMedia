import { supabase } from '../supabase';

export interface SaveDietLogParams {
  userId: string;
  date: string;
  mealType: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  /** Provide to update an existing entry instead of inserting a new one */
  editingId?: string;
  /** Set when logging a saved custom meal so recent-meals tracking works */
  customMealId?: string;
}

/**
 * Insert or update a diet_logs row.
 * Extracted from app/add/diet/confirm.tsx so both the old screen
 * and the new inline AddFoodSheet can share the same save logic.
 */
export async function saveDietLog(params: SaveDietLogParams): Promise<{ error: string | null }> {
  if (params.editingId) {
    const { error } = await supabase
      .from('diet_logs')
      .update({
        meal_type: params.mealType,
        description: params.description,
        calories: params.calories,
        protein_g: params.protein,
        carbs_g: params.carbs,
        fats_g: params.fats,
      })
      .eq('id', params.editingId)
      .eq('user_id', params.userId);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from('diet_logs').insert({
    user_id: params.userId,
    date: params.date,
    meal_type: params.mealType,
    description: params.description,
    calories: params.calories,
    protein_g: params.protein,
    carbs_g: params.carbs,
    fats_g: params.fats,
    ...(params.customMealId ? { custom_meal_id: params.customMealId } : {}),
  } as any);
  return { error: error?.message ?? null };
}
