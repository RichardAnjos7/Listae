"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 12000;

export function useListPresence(listId: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const beat = () => {
      void fetch(`/api/lists/${listId}/presence`, { method: "POST" }).catch(() => {});
    };

    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [listId, enabled]);
}
