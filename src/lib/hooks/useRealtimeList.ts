"use client";

import type { ListItemRow, Product } from "@/types";
import { useEffect, useMemo, useState } from "react";

type Row = ListItemRow & { product?: Product | null };

export function useRealtimeList(listId: string, initial: Row[]) {
  const [items, setItems] = useState<Row[]>(initial);

  useEffect(() => {
    setItems(initial);
  }, [initial, listId]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/lists/${listId}/items`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Row[] };
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        /* offline / transient */
      }
    }

    const id = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [listId]);

  const total = useMemo(
    () =>
      items.reduce((sum, i) => {
        const q = Number(i.quantity);
        const p = i.unit_price != null ? Number(i.unit_price) : 0;
        return sum + q * p;
      }, 0),
    [items]
  );

  return { items, setItems, total };
}
