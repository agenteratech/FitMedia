type StorageLike = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();

  getString(key: string) {
    return this.data.get(key);
  }

  set(key: string, value: string) {
    this.data.set(key, value);
  }

  delete(key: string) {
    this.data.delete(key);
  }
}

const createStorage = (): StorageLike => {
  try {
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new () => StorageLike;
    };
    return new MMKV();
  } catch (error) {
    if (__DEV__) {
      console.warn('MMKV unavailable; using in-memory fallback storage.', error);
    }
    return new MemoryStorage();
  }
};

export const storage = createStorage();

export const storageKeys = {
  exercises: 'exercise_cache_v1',
  workoutCategories: 'workout_categories_cache_v1',
  dailyScore: (userId: string, date: string) => `daily_score_${userId}_${date}`,
};

export const getJSON = <T>(key: string): T | null => {
  try {
    const raw = storage.getString(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const setJSON = (key: string, value: unknown) => {
  storage.set(key, JSON.stringify(value));
};

export const deleteJSON = (key: string) => {
  storage.delete(key);
};
