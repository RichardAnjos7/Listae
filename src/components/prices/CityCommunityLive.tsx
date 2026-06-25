"use client";

import { CommunitySections } from "@/components/prices/CommunitySections";
import type { CommunityInsights } from "@/lib/prices/community-insights";
import { normalizeSinceParam } from "@/lib/prices/community-insights";
import { useCallback, useEffect, useRef, useState } from "react";

function toIsoTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return normalizeSinceParam(value);
  return null;
}

type Props = {
  city: string | null;
  initialData: CommunityInsights;
  compact?: boolean;
};

export function CityCommunityLive({ city, initialData, compact = false }: Props) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const lastSeenRef = useRef<string | null>(
    toIsoTimestamp(initialData.liveFeed[0]?.recorded_at)
  );

  const applyData = useCallback((json: CommunityInsights, incrementalSince: string | null) => {
    if (incrementalSince && json.liveFeed.length > 0) {
      setData((prev) => {
        const mergedIds = new Set(json.liveFeed.map((i) => i.id));
        const rest = prev.liveFeed.filter((i) => !mergedIds.has(i.id));
        return {
          ...json,
          liveFeed: [...json.liveFeed, ...rest].slice(0, 25),
        };
      });
    } else {
      setData(json);
    }
    const newest = toIsoTimestamp(json.liveFeed[0]?.recorded_at);
    if (newest) lastSeenRef.current = newest;
  }, []);

  const fetchInsights = useCallback(
    async (full = false) => {
      const since = full ? null : lastSeenRef.current;
      const url = since
        ? `/api/city/community?since=${encodeURIComponent(since)}`
        : "/api/city/community";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao atualizar");
      const json = (await res.json()) as CommunityInsights;
      applyData(json, since);
    },
    [applyData]
  );

  /** Ao navegar entre Início, Preços etc., o servidor envia dados novos. */
  useEffect(() => {
    setData(initialData);
    lastSeenRef.current = toIsoTimestamp(initialData.liveFeed[0]?.recorded_at);
  }, [initialData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchInsights(true);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, [fetchInsights]);

  return (
    <CommunitySections
      city={city}
      data={data}
      compact={compact}
      onRefresh={refresh}
      refreshing={refreshing}
    />
  );
}
