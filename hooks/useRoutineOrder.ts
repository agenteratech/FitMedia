import { useCallback, useEffect, useMemo, useState } from 'react';
import { getJSON, setJSON, storageKeys } from '../lib/storage';
import type { RoutineItem } from './useRoutines';
import { useAuthStore } from '../stores/authStore';

function orderStorageKey(userId: string): string {
  return `${storageKeys.routineOrder}_${userId}`;
}

/**
 * Applies a user-controlled sort order (persisted in MMKV) to a list of
 * routines fetched from the DB. Any newly created routines not yet in the
 * stored order are appended at the end.
 */
export function useRoutineOrder(items: RoutineItem[]) {
  const { user } = useAuthStore();
  const [customOrder, setCustomOrderState] = useState<string[] | null>(null);

  // Load stored order once the user is known.
  useEffect(() => {
    if (!user) return;
    const stored = getJSON<string[]>(orderStorageKey(user.id));
    setCustomOrderState(stored ?? null);
  }, [user]);

  const orderedItems = useMemo<RoutineItem[]>(() => {
    if (!customOrder || customOrder.length === 0) return items;

    const byId = new Map(items.map((r) => [r.id, r]));
    const seen = new Set<string>();
    const result: RoutineItem[] = [];

    // Ordered items first.
    for (const id of customOrder) {
      const item = byId.get(id);
      if (item) {
        result.push(item);
        seen.add(id);
      }
    }

    // Any items not yet in the stored order (e.g. just created) go at the end.
    for (const item of items) {
      if (!seen.has(item.id)) result.push(item);
    }

    return result;
  }, [items, customOrder]);

  const setOrder = useCallback(
    (ids: string[]) => {
      if (!user) return;
      setCustomOrderState(ids);
      setJSON(orderStorageKey(user.id), ids);
    },
    [user],
  );

  return { orderedItems, setOrder };
}
