"use client";

import type { CommunityInsights } from "@/lib/prices/community-insights";
import { labelFromRecordedAt } from "@/lib/prices/freshness";
import { formatBRL } from "@/lib/utils";
import {
  Activity,
  ArrowDownRight,
  Bell,
  Flame,
  ShoppingCart,
  Store,
  TrendingDown,
  Users,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

type Props = {
  city: string | null;
  data: CommunityInsights;
  compact?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

function productLabel(name: string, brand: string | null) {
  return brand ? `${name} · ${brand}` : name;
}

export function CommunitySections({
  city,
  data,
  compact = false,
  onRefresh,
  refreshing = false,
}: Props) {
  const { stats, liveFeed, heatMap, basketRanking, alerts, comparableBasket, trend7d, activeShoppers } =
    data;

  const hasCommunity = stats.week_count > 0;

  if (!hasCommunity && !city) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center text-sm text-slate-500">
        <Link href="/profile" className="text-emerald-600 font-medium">
          Defina sua cidade
        </Link>{" "}
        para ver dados comunitários em tempo real.
      </section>
    );
  }

  const trendMin = trend7d.length ? Math.min(...trend7d.map((d) => d.avg_price)) : 0;
  const trendMax = trend7d.length ? Math.max(...trend7d.map((d) => d.avg_price)) : 1;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-emerald-600" />
          Comunidade{city ? ` · ${city}` : ""}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <strong>{stats.week_count}</strong> preços registrados esta semana por{" "}
          <strong>{stats.distinct_users_week}</strong>{" "}
          {stats.distinct_users_week === 1 ? "pessoa" : "pessoas"}
          {city ? ` em ${city}` : ""}.
        </p>
        {activeShoppers > 0 && (
          <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
            <ShoppingCart className="h-3.5 w-3.5" />
            {activeShoppers} {activeShoppers === 1 ? "pessoa comprando" : "pessoas comprando"} agora
          </p>
        )}
      </section>

      {liveFeed.length > 0 && (
        <section className="rounded-2xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2 min-w-0">
              <Activity className="h-4 w-4 shrink-0" />
              <span className="truncate">Ao vivo na cidade</span>
            </h2>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="shrink-0 p-1.5 rounded-lg text-emerald-600/80 hover:text-emerald-700 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 disabled:opacity-50"
                aria-label="Atualizar feed da cidade"
                title="Atualizar"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto overscroll-y-contain -mx-1 px-1">
            <ul className="space-y-1.5 text-sm pr-3">
              {(compact ? liveFeed.slice(0, 5) : liveFeed).map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 py-1 border-b border-emerald-200/40 last:border-0"
                >
                  <span className="min-w-0 truncate text-slate-800 dark:text-slate-200">
                    <span className="text-[10px] text-slate-400 mr-1">
                      {labelFromRecordedAt(item.recorded_at)}
                    </span>
                    {productLabel(item.product_name, item.brand)} — {item.store_name}
                  </span>
                  <span className="text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatBRL(item.unit_price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {compact && liveFeed.length > 5 && (
            <Link href="/prices" className="block text-center text-xs text-emerald-600 font-medium mt-2">
              Ver feed completo →
            </Link>
          )}
        </section>
      )}

      {heatMap.length > 0 && !compact && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Menor preço hoje (mapa de calor)
          </h2>
          <ul className="space-y-1.5 text-sm">
            {heatMap.map((item) => (
              <li key={item.product_id} className="flex justify-between gap-2">
                <span className="truncate">{productLabel(item.product_name, item.brand)}</span>
                <span className="shrink-0 text-right">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatBRL(item.unit_price)}
                  </span>
                  <span className="block text-[10px] text-slate-400">{item.store_name}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {basketRanking.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
            <Store className="h-4 w-4 text-emerald-600" />
            Cesta básica por mercado
            <span className="text-[10px] font-normal text-slate-400">arroz, feijão, leite, óleo…</span>
          </h2>
          <ul className="space-y-2 text-sm">
            {basketRanking.slice(0, compact ? 4 : 8).map((row, i) => (
              <li key={row.store_key} className="flex justify-between gap-2">
                <span className="font-medium truncate">
                  {i === 0 && "🥇 "}
                  {row.store_name}
                  <span className="text-[10px] text-slate-400 block">
                    {row.items_found}/{row.items_expected} itens
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatBRL(row.basket_total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {alerts.length > 0 && (
        <section className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4" />
            Alertas comunitários (hoje)
          </h2>
          <ul className="space-y-1.5 text-sm">
            {alerts.map((a) => (
              <li key={a.product_id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {a.drop_count} {a.drop_count === 1 ? "registro" : "registros"} de queda em{" "}
                  <strong>{a.product_name}</strong>
                </span>
                <span className="shrink-0 text-emerald-600 flex items-center gap-0.5 font-medium">
                  <ArrowDownRight className="h-3.5 w-3.5" />-{a.avg_drop_pct}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {comparableBasket.length > 0 && !compact && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Cesta comparável (15 produtos)
          </h2>
          <p className="text-xs text-slate-500 mb-2">Total estimado da comunidade nos últimos 30 dias</p>
          <ul className="space-y-2 text-sm">
            {comparableBasket.map((row, i) => (
              <li key={row.store_key} className="flex justify-between gap-2">
                <span>
                  {i === 0 ? "★ " : ""}
                  {row.store_name}
                  <span className="text-[10px] text-slate-400 block">{row.items_matched} itens</span>
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatBRL(row.basket_total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trend7d.length > 1 && !compact && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4" />
            Tendência 7 dias — arroz
          </h2>
          <div className="flex items-end gap-1 h-20">
            {trend7d.map((d) => {
              const range = trendMax - trendMin || 1;
              const h = Math.max(12, ((d.avg_price - trendMin) / range) * 72 + 12);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-emerald-500/80 dark:bg-emerald-600"
                    style={{ height: `${h}px` }}
                    title={`${d.day}: ${formatBRL(d.avg_price)}`}
                  />
                  <span className="text-[8px] text-slate-400">
                    {d.day.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            Último: {formatBRL(trend7d[trend7d.length - 1]?.avg_price ?? 0)}
          </p>
        </section>
      )}
    </div>
  );
}
