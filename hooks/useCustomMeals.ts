import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type CustomMealIngredient = {
  id: string;
  meal_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sort_order: number;
};

export type CustomMeal = {
  id: string;
  user_id: string;
  name: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  created_at: string;
  updated_at: string;
  ingredients: CustomMealIngredient[];
};

export type IngredientDraft = {
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sort_order: number;
};

// Cast to any so TypeScript doesn't complain about tables not yet in generated types.
// Remove once types/database.ts is regenerated after running the migration SQL.
const db = supabase as any;

function computeTotals(ingredients: IngredientDraft[]) {
  return {
    total_calories: ingredients.reduce((s, i) => s + i.calories, 0),
    total_protein_g: ingredients.reduce((s, i) => s + i.protein_g, 0),
    total_carbs_g: ingredients.reduce((s, i) => s + i.carbs_g, 0),
    total_fat_g: ingredients.reduce((s, i) => s + i.fat_g, 0),
  };
}

export function useCustomMeals() {
  const { user } = useAuthStore();
  const [meals, setMeals] = useState<CustomMeal[]>([]);
  const [recentMealIds, setRecentMealIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    if (!user) { setMeals([]); setRecentMealIds([]); return; }
    setLoading(true);
    setError(null);

    const [mealsRes, recentRes] = await Promise.all([
      db
        .from('custom_meals')
        .select('*, ingredients:custom_meal_ingredients(*)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      db
        .from('diet_logs')
        .select('custom_meal_id')
        .eq('user_id', user.id)
        .not('custom_meal_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    if (mealsRes.error) {
      setError(mealsRes.error.message);
      setLoading(false);
      return;
    }

    const rawMeals = (mealsRes.data ?? []) as CustomMeal[];
    rawMeals.forEach((m) => {
      m.ingredients = (m.ingredients ?? []).sort(
        (a: CustomMealIngredient, b: CustomMealIngredient) => a.sort_order - b.sort_order,
      );
    });
    setMeals(rawMeals);

    if (!recentRes.error && recentRes.data) {
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const row of recentRes.data as { custom_meal_id: string | null }[]) {
        if (row.custom_meal_id && !seen.has(row.custom_meal_id)) {
          seen.add(row.custom_meal_id);
          ids.push(row.custom_meal_id);
        }
        if (ids.length >= 5) break;
      }
      setRecentMealIds(ids);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const createMeal = useCallback(async (
    name: string,
    ingredients: IngredientDraft[],
  ): Promise<string | null> => {
    if (!user) return 'Not authenticated';
    const totals = computeTotals(ingredients);

    const { data: mealData, error: mealErr } = await db
      .from('custom_meals')
      .insert({ user_id: user.id, name, ...totals })
      .select('id')
      .single();

    if (mealErr || !mealData) return mealErr?.message ?? 'Failed to create meal';

    if (ingredients.length > 0) {
      const rows = ingredients.map((ing, idx) => ({
        meal_id: mealData.id,
        food_name: ing.food_name,
        quantity: ing.quantity,
        unit: ing.unit,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
        sort_order: idx,
      }));
      const { error: ingErr } = await db.from('custom_meal_ingredients').insert(rows);
      if (ingErr) return ingErr.message;
    }

    await fetchMeals();
    return null;
  }, [user, fetchMeals]);

  const updateMeal = useCallback(async (
    id: string,
    name: string,
    ingredients: IngredientDraft[],
  ): Promise<string | null> => {
    if (!user) return 'Not authenticated';
    const totals = computeTotals(ingredients);

    const { error: mealErr } = await db
      .from('custom_meals')
      .update({ name, ...totals, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (mealErr) return mealErr.message;

    await db.from('custom_meal_ingredients').delete().eq('meal_id', id);

    if (ingredients.length > 0) {
      const rows = ingredients.map((ing, idx) => ({
        meal_id: id,
        food_name: ing.food_name,
        quantity: ing.quantity,
        unit: ing.unit,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
        sort_order: idx,
      }));
      const { error: ingErr } = await db.from('custom_meal_ingredients').insert(rows);
      if (ingErr) return ingErr.message;
    }

    await fetchMeals();
    return null;
  }, [user, fetchMeals]);

  const deleteMeal = useCallback(async (id: string): Promise<string | null> => {
    if (!user) return 'Not authenticated';
    const { error: err } = await db
      .from('custom_meals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (err) return err.message;
    await fetchMeals();
    return null;
  }, [user, fetchMeals]);

  const duplicateMeal = useCallback(async (meal: CustomMeal): Promise<string | null> => {
    return createMeal(
      `${meal.name} (copy)`,
      meal.ingredients.map((ing, idx) => ({
        food_name: ing.food_name,
        quantity: ing.quantity,
        unit: ing.unit,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
        sort_order: idx,
      })),
    );
  }, [createMeal]);

  const recentMeals = meals
    .filter((m) => recentMealIds.includes(m.id))
    .sort((a, b) => recentMealIds.indexOf(a.id) - recentMealIds.indexOf(b.id));

  return {
    meals,
    recentMeals,
    loading,
    error,
    refetch: fetchMeals,
    createMeal,
    updateMeal,
    deleteMeal,
    duplicateMeal,
  };
}
