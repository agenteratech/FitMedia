import { create } from 'zustand';
import type { Database } from '../types/database';
import { getJSON, setJSON, storageKeys } from '../lib/storage';

export type WorkoutCategory = Database['public']['Tables']['workout_categories']['Row'];

type CategoryCache = {
  items: WorkoutCategory[];
  updatedAt: number;
};

const loadCache = (): CategoryCache => {
  const cached = getJSON<CategoryCache>(storageKeys.workoutCategories);
  if (cached && Array.isArray(cached.items)) {
    return cached;
  }
  return { items: [], updatedAt: 0 };
};

export type CategoryStore = {
  items: WorkoutCategory[];
  updatedAt: number;
  setItems: (items: WorkoutCategory[]) => void;
  upsertCategory: (category: WorkoutCategory) => void;
};

const initial = loadCache();

export const useCategoryStore = create<CategoryStore>((set) => ({
  items: initial.items,
  updatedAt: initial.updatedAt,
  setItems: (items) => {
    const payload: CategoryCache = { items, updatedAt: Date.now() };
    setJSON(storageKeys.workoutCategories, payload);
    set({ items: payload.items, updatedAt: payload.updatedAt });
  },
  upsertCategory: (category) =>
    set((state) => {
      const nextItems = state.items.some((item) => item.id === category.id)
        ? state.items.map((item) => (item.id === category.id ? category : item))
        : [...state.items, category];
      const payload: CategoryCache = { items: nextItems, updatedAt: Date.now() };
      setJSON(storageKeys.workoutCategories, payload);
      return { items: payload.items, updatedAt: payload.updatedAt };
    }),
}));
