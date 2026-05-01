import { supabase } from '../supabase';

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/fatsecret`;

export interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_type: string;
  brand_name: string | null;
  food_description: string;
}

export interface FatSecretServing {
  serving_id: string;
  serving_description: string;
  metric_serving_amount: number;
  metric_serving_unit: string;
  calories: number;
  carbohydrate: number;
  protein: number;
  fat: number;
}

export interface FatSecretFoodDetail {
  food_id: string;
  food_name: string;
  brand_name: string | null;
  servings: FatSecretServing[];
}

export interface SearchResponse {
  foods: FatSecretFood[];
  total: number;
  page: number;
}

async function call<T>(action: string, params: Record<string, string>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const qs = new URLSearchParams({ action, ...params });
  const res = await fetch(`${FUNCTION_URL}?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* keep null */ }

  if (!res.ok) {
    const msg = body?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export function searchFoods(q: string, page = 0): Promise<SearchResponse> {
  if (!q.trim()) return Promise.resolve({ foods: [], total: 0, page: 0 });
  return call<SearchResponse>('search', { q, page: String(page) });
}

export function getFoodDetail(foodId: string): Promise<FatSecretFoodDetail> {
  return call<FatSecretFoodDetail>('food', { id: foodId });
}

/**
 * Pick the gram-based reference serving to use for per-weight nutrition.
 * Prefers an explicit "g" serving; otherwise falls back to the first serving
 * that has a metric_serving_amount > 0; otherwise null.
 */
export function pickReferenceServing(servings: FatSecretServing[]): FatSecretServing | null {
  const grams = servings.find((s) => s.metric_serving_unit === 'g' && s.metric_serving_amount > 0);
  if (grams) return grams;
  const anyMetric = servings.find((s) => s.metric_serving_amount > 0);
  return anyMetric ?? null;
}
