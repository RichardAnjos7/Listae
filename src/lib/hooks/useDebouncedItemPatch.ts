"use client";

import { useCallback, useEffect, useRef } from "react";

export type ItemPatch = {
  quantity?: number;
  unit_price?: number | null;
  checked?: boolean;
};

type Options = {
  debounceMs?: number;
  onPersist: (itemId: string, patch: ItemPatch) => Promise<void>;
  onPersistError?: () => void;
};

export function useDebouncedItemPatch({
  debounceMs = 400,
  onPersist,
  onPersistError,
}: Options) {
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingRef = useRef(new Map<string, ItemPatch>());
  const onPersistRef = useRef(onPersist);
  const onPersistErrorRef = useRef(onPersistError);

  useEffect(() => {
    onPersistRef.current = onPersist;
  }, [onPersist]);

  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);

  const flushItem = useCallback((itemId: string) => {
    const timer = timersRef.current.get(itemId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(itemId);
    }
    const patch = pendingRef.current.get(itemId);
    if (!patch) return;
    pendingRef.current.delete(itemId);
    void onPersistRef.current(itemId, patch).catch(() => onPersistErrorRef.current?.());
  }, []);

  const schedule = useCallback(
    (itemId: string, patch: ItemPatch) => {
      const merged = { ...pendingRef.current.get(itemId), ...patch };
      pendingRef.current.set(itemId, merged);

      const existing = timersRef.current.get(itemId);
      if (existing) clearTimeout(existing);

      timersRef.current.set(
        itemId,
        setTimeout(() => flushItem(itemId), debounceMs)
      );
    },
    [debounceMs, flushItem]
  );

  useEffect(() => {
    const timers = timersRef.current;
    const pending = pendingRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const [itemId, patch] of pending.entries()) {
        void onPersistRef.current(itemId, patch).catch(() => onPersistErrorRef.current?.());
      }
      pending.clear();
    };
  }, []);

  return { schedule, flushItem };
}
