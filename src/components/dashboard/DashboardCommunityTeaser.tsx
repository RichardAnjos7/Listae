"use client";

import { LiveFeedPriceCell } from "@/components/prices/LiveFeedPriceCell";
import type { CommunityInsights } from "@/lib/prices/community-insights";
import { labelFromRecordedAt } from "@/lib/prices/freshness";
import { Activity, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Props = {
  city: string | null;
  data: CommunityInsights | null;
};

function productLabel(name: string, brand: string | null) {
  return brand ? `${name} · ${brand}` : name;
}

export function DashboardCommunityTeaser({ city, data }: Props) {
  const [insights, setInsights] = useState(data);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setInsights(data);
  }, [data]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/city/community", { cache: "no-store" });
      if (res.ok) setInsights((await res.json()) as CommunityInsights);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (!city) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4 text-sm text-slate-500">
        <MapPin className="h-5 w-5 text-slate-400 mb-2" />
        <Link href="/profile" className="text-emerald-600 font-medium">
          Defina sua cidade
        </Link>{" "}
        para ver preços da comunidade.
      </section>
    );
  }

  const live = insights?.liveFeed.slice(0, 5) ?? [];
  const weekCount = insights?.stats.week_count ?? 0;

  if (weekCount === 0 && live.length === 0) {
    return (
      <Link
        href="/prices"
        className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
      >
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span>Preços em {city}</span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Ainda sem registros na cidade. Conclua compras para alimentar a base.
        </p>
      </Link>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 shrink-0" />
          <span className="truncate">Ao vivo · {city}</span>
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="p-1.5 rounded-lg text-emerald-600/80 hover:text-emerald-700 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
            aria-label="Atualizar feed da cidade"
            title="Atualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/prices"
            aria-label="Ver feed da cidade"
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {weekCount > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
          <strong>{weekCount}</strong> preços esta semana na comunidade
        </p>
      )}
      {live.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {live.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-2 py-1 border-b border-emerald-200/40 last:border-0"
            >
              <span className="min-w-0 truncate text-slate-800 dark:text-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 mr-1">
                  {labelFromRecordedAt(item.recorded_at)}
                </span>
                {productLabel(item.product_name, item.brand)} — {item.store_name}
              </span>
              <LiveFeedPriceCell
                unitPrice={item.unit_price}
                isPromotion={item.is_promotion}
                validUntil={item.valid_until}
                className="shrink-0 text-xs"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">Nenhum registro recente.</p>
      )}
      <Link
        href="/prices"
        className="block text-center text-xs text-emerald-600 font-medium mt-2.5"
      >
        Ver feed completo →
      </Link>
    </section>
  );
}
