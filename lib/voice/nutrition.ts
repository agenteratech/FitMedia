import {
  searchFoods,
  getFoodDetail,
  pickReferenceServing,
  type FatSecretServing,
} from '../fatsecret/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReviewItem = {
  id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  // Per-unit values so the quantity can be re-scaled in the review step.
  cal_per_unit: number;
  protein_per_unit: number;
  carbs_per_unit: number;
  fat_per_unit: number;
};

// Approximate grams for weight/volume units. Count-based units (piece, slice,
// scoop, serving) are handled separately in scaleNutrition().
const UNIT_GRAMS: Record<string, number> = {
  g: 1, ml: 1, oz: 28.35, cup: 240, tbsp: 15, tsp: 5,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function scaleNutrition(
  serving: FatSecretServing,
  quantity: number,
  unit: string,
): { scale: number; perUnit: number } {
  const gramsPerUnit = UNIT_GRAMS[unit] ?? 0;
  if (gramsPerUnit > 0) {
    const totalGrams = quantity * gramsPerUnit;
    const scale = totalGrams / (serving.metric_serving_amount || 100);
    return { scale, perUnit: quantity > 0 ? scale / quantity : 0 };
  }
  // count-based units (piece, slice, scoop, serving)
  return { scale: quantity, perUnit: 1 };
}

/** Re-scale an item's macros when the user edits its quantity in review. */
export function rescale(item: ReviewItem, newQty: number): ReviewItem {
  const qty = Math.max(0, newQty);
  return {
    ...item,
    quantity:  qty,
    calories:  Math.round(item.cal_per_unit     * qty),
    protein_g: Math.round(item.protein_per_unit * qty * 10) / 10,
    carbs_g:   Math.round(item.carbs_per_unit   * qty * 10) / 10,
    fat_g:     Math.round(item.fat_per_unit     * qty * 10) / 10,
  };
}

/** Build a zero-macro placeholder for a food we couldn't look up. */
export function placeholderItem(foodName: string, quantity: number, unit: string): ReviewItem {
  return {
    id: makeId(),
    food_name: foodName,
    quantity,
    unit,
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
    cal_per_unit: 0, protein_per_unit: 0, carbs_per_unit: 0, fat_per_unit: 0,
  };
}

/**
 * Look up a food via FatSecret and return a fully-scaled ReviewItem, or null if
 * nothing usable was found. Never throws — callers fall back to a placeholder.
 */
export async function lookupNutrition(
  foodName: string,
  quantity: number,
  unit: string,
): Promise<ReviewItem | null> {
  try {
    const res = await searchFoods(foodName);
    if (!res.foods.length) return null;

    const detail = await getFoodDetail(res.foods[0].food_id);
    const ref = pickReferenceServing(detail.servings);
    if (!ref) return null;

    const { scale, perUnit } = scaleNutrition(ref, quantity, unit);

    return {
      id: makeId(),
      food_name: detail.food_name,
      quantity,
      unit,
      calories:  Math.round(ref.calories     * scale),
      protein_g: Math.round(ref.protein      * scale * 10) / 10,
      carbs_g:   Math.round(ref.carbohydrate * scale * 10) / 10,
      fat_g:     Math.round(ref.fat          * scale * 10) / 10,
      cal_per_unit:     ref.calories     * perUnit,
      protein_per_unit: ref.protein      * perUnit,
      carbs_per_unit:   ref.carbohydrate * perUnit,
      fat_per_unit:     ref.fat          * perUnit,
    };
  } catch {
    return null;
  }
}
