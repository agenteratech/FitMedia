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

let _storageInstance: StorageLike | null = null;

function getStorageInstance(): StorageLike {
  if (_storageInstance !== null) return _storageInstance;
  try {
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new () => StorageLike;
    };
    _storageInstance = new MMKV();
  } catch (error) {
    // Falling back to MemoryStorage means values are not written to disk.
    // The user will lose persistent state on every cold restart.
    console.error('[Storage] MMKV failed to initialise; falling back to in-memory storage. Session will NOT persist across app restarts.', error);
    _storageInstance = new MemoryStorage();
  }
  return _storageInstance;
}

// Lazy proxy — defers MMKV initialisation to first use so the native module
// is guaranteed to be ready (avoids "initialized before JSI is bound" crashes).
export const storage: StorageLike = {
  getString: (key) => getStorageInstance().getString(key),
  set:       (key, value) => getStorageInstance().set(key, value),
  delete:    (key) => getStorageInstance().delete(key),
};

export const storageKeys = {
  exercises: 'exercise_cache_v1',
  workoutCategories: 'workout_categories_cache_v1',
  dailyScore: (userId: string, date: string) => `daily_score_${userId}_${date}`,
  // Routine custom sort order (not in DB — stored locally, per user)
  routineOrder: 'routine_order_v1',
  // Routine default weights (weight not in DB schema — stored locally)
  routineWeights: 'routine_exercise_weights_v1',
  // AI Companion
  companionTutorialSeen: 'companion_tutorial_seen',
  companionEnabled: 'companion_enabled',
  companionPersonality: 'companion_personality',
  notificationsGranted: 'notifications_granted',
  notifWorkout: 'notif_workout',
  notifDiet: 'notif_diet',
  notifSleep: 'notif_sleep',
  notifStreak: 'notif_streak',
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
