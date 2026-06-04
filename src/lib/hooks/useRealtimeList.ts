"use client";

import type { ListItemRow } from "@/types";
import { lineTotal } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ListItemRowExt = ListItemRow & {
  product?: ListItemRow["product"] | null;
  added_by_profile?: { id: string; name: string } | null;
  _optimistic?: boolean;
};

export type SyncStatus = "live" | "syncing" | "offline" | "connecting";

export type PresenceUser = { userId: string; name: string };

export type ListChangeEvent = {
  type: "partner_add" | "partner_update";
  item: ListItemRowExt;
  lineTotal: number;
  addedByName?: string;
};

export const BUDGET_ALERT_THRESHOLD = 30;

type Options = {
  listId: string;
  currentUserId: string;
  initial: ListItemRowExt[];
  onRemoteChange?: (event: ListChangeEvent) => void;
};

async function fetchItems(listId: string): Promise<ListItemRowExt[]> {
  const res = await fetch(`/api/lists/${listId}/items`, { cache: "no-store" });
  if (!res.ok) throw new Error("fetch failed");
  const data = (await res.json()) as { items: ListItemRowExt[] };
  return data.items ?? [];
}

export function useRealtimeList({ listId, currentUserId, initial, onRemoteChange }: Options) {
  const [items, setItems] = useState<ListItemRowExt[]>(initial);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const itemsRef = useRef(items);
  const onRemoteChangeRef = useRef(onRemoteChange);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  }, [onRemoteChange]);

  useEffect(() => {
    setItems(initial);
  }, [initial, listId]);

  const refresh = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }
    setSyncStatus((s) => (s === "live" ? "syncing" : s));
    try {
      const next = await fetchItems(listId);
      const prev = itemsRef.current.filter((i) => !i._optimistic);
      const prevIds = new Set(prev.map((i) => i.id));

      for (const item of next) {
        if (!prevIds.has(item.id)) {
          const addedBy = item.added_by_profile?.id ?? item.added_by;
          if (addedBy && addedBy !== currentUserId) {
            onRemoteChangeRef.current?.({
              type: "partner_add",
              item,
              lineTotal: lineTotal(
                Number(item.quantity),
                item.unit_price != null ? Number(item.unit_price) : null
              ),
              addedByName: item.added_by_profile?.name,
            });
          }
        } else {
          const old = prev.find((p) => p.id === item.id);
          if (old && old.updated_at !== item.updated_at) {
            const addedBy = item.added_by_profile?.id ?? item.added_by;
            if (addedBy && addedBy !== currentUserId) {
              const newLine = lineTotal(
                Number(item.quantity),
                item.unit_price != null ? Number(item.unit_price) : null
              );
              const oldLine = lineTotal(
                Number(old.quantity),
                old.unit_price != null ? Number(old.unit_price) : null
              );
              if (newLine > oldLine) {
                onRemoteChangeRef.current?.({
                  type: "partner_update",
                  item,
                  lineTotal: newLine - oldLine,
                  addedByName: item.added_by_profile?.name,
                });
              }
            }
          }
        }
      }

      setItems(next);
      setLastSyncedAt(new Date());
      setSyncStatus("live");
    } catch {
      setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "syncing");
    }
  }, [listId, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    let pollId: number | undefined;
    let es: EventSource | null = null;

    const startPoll = () => {
      if (pollId) return;
      void refresh();
      pollId = window.setInterval(() => void refresh(), 2000);
    };

    const stopPoll = () => {
      if (pollId) {
        window.clearInterval(pollId);
        pollId = undefined;
      }
    };

    try {
      es = new EventSource(`/api/lists/${listId}/stream`);
      es.onopen = () => {
        if (cancelled) return;
        setSyncStatus("live");
        stopPoll();
      };
      es.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(ev.data) as {
            type: string;
            online?: PresenceUser[];
          };
          if (data.type === "items_changed") void refresh();
          if (data.type === "presence" && data.online) {
            setOnlineUsers(
              data.online.filter((u) => u.userId !== currentUserId)
            );
          }
          if (data.type === "connected") void refresh();
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        if (cancelled) return;
        es?.close();
        es = null;
        setSyncStatus("syncing");
        startPoll();
      };
    } catch {
      startPoll();
    }

    const onOnline = () => void refresh();
    const onOffline = () => setSyncStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      es?.close();
      stopPoll();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [listId, currentUserId, refresh]);

  const applyOptimisticAdd = useCallback(
    (product: NonNullable<ListItemRowExt["product"]>, quantity = 1, unitPrice: number | null = null) => {
      setItems((prev) => {
        const real = prev.filter((i) => !i._optimistic);
        const existing = real.find((i) => i.product_id === product.id);
        if (existing) {
          return real.map((i) =>
            i.id === existing.id
              ? {
                  ...i,
                  quantity: Number(i.quantity) + quantity,
                  unit_price: i.unit_price ?? unitPrice,
                }
              : i
          );
        }
        const optimistic: ListItemRowExt = {
          id: `opt-${crypto.randomUUID()}`,
          list_id: listId,
          product_id: product.id,
          quantity,
          unit_price: unitPrice,
          checked: false,
          added_by: currentUserId,
          notes: null,
          created_at: new Date().toISOString(),
          product,
          added_by_profile: null,
          _optimistic: true,
        };
        return [...real, optimistic];
      });
    },
    [listId, currentUserId]
  );

  const applyOptimisticPatch = useCallback((itemId: string, patch: Partial<ListItemRowExt>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i))
    );
  }, []);

  const applyOptimisticRemove = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const total = useMemo(
    () =>
      items.reduce((sum, i) => {
        const q = Number(i.quantity);
        const p = i.unit_price != null ? Number(i.unit_price) : 0;
        return sum + q * p;
      }, 0),
    [items]
  );

  const uncheckedCount = useMemo(
    () => items.filter((i) => !i.checked).length,
    [items]
  );

  return {
    items,
    setItems,
    total,
    uncheckedCount,
    syncStatus,
    lastSyncedAt,
    onlineUsers,
    refresh,
    applyOptimisticAdd,
    applyOptimisticPatch,
    applyOptimisticRemove,
  };
}
