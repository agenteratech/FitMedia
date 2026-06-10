import { useCallback, useEffect, useState } from 'react';
import { storage, storageKeys } from '../lib/storage';
import type { Personality, NotifCategory } from '../lib/companion/messages';
import { scheduleNotifications, cancelNotifications } from '../lib/companion/notifications';

const DEFAULT_CATEGORIES: Record<NotifCategory, boolean> = {
  workout: true,
  diet:    true,
  sleep:   true,
  streak:  true,
};

function readBool(key: string, fallback: boolean): boolean {
  const v = storage.getString(key);
  if (v === undefined) return fallback;
  return v === 'true';
}

function readPersonality(): Personality {
  const v = storage.getString(storageKeys.companionPersonality);
  if (v === 'friendly' || v === 'motivational' || v === 'strict' || v === 'playful') return v;
  return 'friendly';
}

function readCategories(): Record<NotifCategory, boolean> {
  const keys: NotifCategory[] = ['workout', 'diet', 'sleep', 'streak'];
  const result = { ...DEFAULT_CATEGORIES };
  for (const k of keys) {
    const storeKey = (storageKeys as unknown as Record<string, string>)[`notif${k.charAt(0).toUpperCase() + k.slice(1)}`];
    if (storeKey) {
      const v = storage.getString(storeKey);
      if (v !== undefined) result[k] = v === 'true';
    }
  }
  return result;
}

export function useCompanion() {
  const [tutorialSeen,       setTutorialSeenState]      = useState(() => readBool(storageKeys.companionTutorialSeen, false));
  const [enabled,            setEnabledState]            = useState(() => readBool(storageKeys.companionEnabled, true));
  const [personality,        setPersonalityState]        = useState<Personality>(readPersonality);
  const [notificationsGranted, setNotificationsGrantedState] = useState(() => readBool(storageKeys.notificationsGranted, false));
  const [categories,         setCategoriesState]         = useState<Record<NotifCategory, boolean>>(readCategories);

  const markTutorialSeen = useCallback(() => {
    storage.set(storageKeys.companionTutorialSeen, 'true');
    setTutorialSeenState(true);
  }, []);

  const replayTutorial = useCallback(() => {
    storage.set(storageKeys.companionTutorialSeen, 'false');
    setTutorialSeenState(false);
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    storage.set(storageKeys.companionEnabled, String(val));
    setEnabledState(val);
    if (!val) cancelNotifications();
  }, []);

  const setPersonality = useCallback((p: Personality) => {
    storage.set(storageKeys.companionPersonality, p);
    setPersonalityState(p);
  }, []);

  const setNotificationsGranted = useCallback((granted: boolean) => {
    storage.set(storageKeys.notificationsGranted, String(granted));
    setNotificationsGrantedState(granted);
  }, []);

  const setCategory = useCallback((cat: NotifCategory, val: boolean) => {
    const keyMap: Record<NotifCategory, string> = {
      workout: storageKeys.notifWorkout,
      diet:    storageKeys.notifDiet,
      sleep:   storageKeys.notifSleep,
      streak:  storageKeys.notifStreak,
    };
    storage.set(keyMap[cat], String(val));
    setCategoriesState((prev) => ({ ...prev, [cat]: val }));
  }, []);

  // Reschedule when personality or categories change, if notifications are granted.
  useEffect(() => {
    if (!notificationsGranted || !enabled) return;
    scheduleNotifications(personality, categories);
  }, [personality, categories, notificationsGranted, enabled]);

  return {
    tutorialSeen,
    markTutorialSeen,
    replayTutorial,
    enabled,
    setEnabled,
    personality,
    setPersonality,
    notificationsGranted,
    setNotificationsGranted,
    categories,
    setCategory,
  };
}
