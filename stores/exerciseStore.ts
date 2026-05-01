import { create } from 'zustand';
import type { Database } from '../types/database';
import { getJSON, setJSON, storageKeys } from '../lib/storage';

export type Exercise = Database['public']['Tables']['exercises']['Row'];

type ExerciseCache = {
  items: Exercise[];
  updatedAt: number;
};

const loadCache = (): ExerciseCache => {
  const cached = getJSON<ExerciseCache>(storageKeys.exercises);
  if (cached && Array.isArray(cached.items)) {
    return cached;
  }
  return { items: [], updatedAt: 0 };
};

export type ExerciseStore = {
  items: Exercise[];
  updatedAt: number;
  setItems: (items: Exercise[]) => void;
};

const initial = loadCache();

export const useExerciseStore = create<ExerciseStore>((set) => ({
  items: initial.items,
  updatedAt: initial.updatedAt,
  setItems: (items) => {
    const payload: ExerciseCache = { items, updatedAt: Date.now() };
    setJSON(storageKeys.exercises, payload);
    set({ items: payload.items, updatedAt: payload.updatedAt });
  },
}));
