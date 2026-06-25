import { DepthNav } from "@/components/navigation/DepthNav";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { lastVsAvg, marketVsCheapest } from "@/lib/dashboard/market-helpers";
import type { MonthlyStats, SavingsSuggestion } from "@/types";
import { formatBRL } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default async function HabitsPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const [mostRes, varRes, marketsRes, monthlyRes, savingsRes] = await Promise.all([
    sql`select * from public.get_most_bought_products(${userId}::uuid, ${12})`,
    sql`select * from public.get_price_variations(${userId}::uuid, ${15})`,
    sql`select * from public.compare_supermarket_prices(${userId}::uuid)`,
    sql`select public.get_monthly_stats(${userId}::uuid) as stats`,
    sql`select public.get_savings_suggestion(${userId}::uuid) as suggestion`,
  ]);

  const mostBought = (mostRes ?? []) as Array<{
    product_id: string;
    product_name: string;
    times_bought: number;
    last_price: number | null;
  }>;
  const variations = (varRes ?? []) as Array<{
    product_id: string;
    product_name: string;
    variation_pct: number | null;
    direction: string;
    current_price: number;
    previous_price: number;
  }>;
  const markets = (marketsRes ?? []) as Array<{
    supermarket_id: string;
    supermarket_name: string;
    trip_count: number;
    avg_total: number;
    last_total: number | null;
  }>;
  const monthly = (monthlyRes[0]?.stats ?? null) as MonthlyStats | null;
  const savings = (savingsRes[0]?.suggestion ?? { has_suggestion: false }) as SavingsSuggestion;

  const minMarketAvg =
    markets.length > 0 ? Math.min(...markets.map((m) => Number(m.avg_total))) : null;

  const hasData =
    (monthly?.trips_this_month ?? 0) > 0 ||
    mostBought.length > 0 ||
    variations.length > 0 ||
    markets.length > 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href="/" className="text-xs text-emerald-600 font-medium">
          ← Início
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-2">Meus hábitos</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Gastos, mercados e produtos que você mais compra
        </p>
        <div className="mt-3">
          <DepthNav current="habits" />
        </div>
      </div>

      {!hasData && (
        <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-sm text-slate-500">
          <p>Conclua compras com preços para ver suas estatísticas.</p>
          <Link
            href="/lists"
            className="inline-block mt-3 rounded-xl bg-emerald-600 text-white text-xs font-medium px-4 py-2"
          >
            Ir às listas
          </Link>
        </section>
      )}

      {monthly && (monthly.trips_this_month ?? 0) > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Resumo do mês</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Total</p>
              <p className="font-semibold text-lg">{formatBRL(Number(monthly.month_total ?? 0))}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Média por compra</p>
              <p className="font-semibold text-lg">{formatBRL(Number(monthly.avg_per_trip_month ?? 0))}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 text-xs">Compras concluídas</p>
              <p className="font-medium">{monthly.trips_this_month ?? 0}</p>
            </div>
          </div>
        </section>
      )}

      {savings.has_suggestion && savings.estimated_savings != null && savings.estimated_savings > 0 && (
        <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 text-sm">
          <p className="font-medium text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Sugestão de economia
          </p>
          <p className="mt-2 text-emerald-800 dark:text-emerald-200">
            Você economizaria cerca de{" "}
            <strong>{formatBRL(Number(savings.estimated_savings))}</strong> comprando com mais frequência no{" "}
            <strong>{savings.best_market_name}</strong> em vez de <strong>{savings.worst_market_name}</strong>.
          </p>
        </section>
      )}

      {markets.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Comparação entre mercados
          </h2>
          <ul className="space-y-2 text-sm">
            {markets.map((m) => {
              const vsCheapest = marketVsCheapest(
                Number(m.avg_total),
                minMarketAvg,
                markets.length
              );
              const lastDelta = lastVsAvg(
                m.last_total != null ? Number(m.last_total) : null,
                Number(m.avg_total),
                Number(m.trip_count)
              );
              const isCheapest =
                minMarketAvg != null &&
                markets.length > 1 &&
                Number(m.avg_total) <= minMarketAvg;

              return (
                <li
                  key={m.supermarket_id}
                  className="flex justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{m.supermarket_name}</span>
                    <span className="text-[10px] text-slate-400">{m.trip_count} compras</span>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-slate-600 dark:text-slate-400">
                      média {formatBRL(Number(m.avg_total))}
                    </p>
                    {isCheapest && markets.length > 1 && (
                      <p className="text-[10px] font-medium text-emerald-600">menor média</p>
                    )}
                    {!isCheapest && vsCheapest.pct != null && vsCheapest.pct > 0 && (
                      <p className="text-[10px] font-medium text-red-600 flex items-center justify-end gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />+{vsCheapest.pct}% vs mais barato
                      </p>
                    )}
                    {lastDelta.pct != null && lastDelta.pct > 0 && (
                      <p
                        className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${
                          lastDelta.direction === "up"
                            ? "text-red-600"
                            : lastDelta.direction === "down"
                              ? "text-emerald-600"
                              : "text-slate-500"
                        }`}
                      >
                        {lastDelta.direction === "up" && <ArrowUpRight className="h-3 w-3" />}
                        {lastDelta.direction === "down" && <ArrowDownRight className="h-3 w-3" />}
                        {lastDelta.direction === "flat" && <Minus className="h-3 w-3" />}
                        última {lastDelta.direction === "down" ? "-" : lastDelta.direction === "up" ? "+" : ""}
                        {lastDelta.pct}% vs média
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {variations.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Variação de preço (último vs anterior)
          </h2>
          <ul className="space-y-2">
            {variations.map((v) => (
              <li key={v.product_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{v.product_name}</span>
                <span
                  className={`flex items-center gap-0.5 shrink-0 font-medium ${
                    v.direction === "up"
                      ? "text-red-600"
                      : v.direction === "down"
                        ? "text-emerald-600"
                        : "text-slate-500"
                  }`}
                >
                  {v.direction === "up" && <ArrowUpRight className="h-4 w-4" />}
                  {v.direction === "down" && <ArrowDownRight className="h-4 w-4" />}
                  {v.direction === "flat" && <Minus className="h-4 w-4" />}
                  {v.variation_pct != null ? `${v.variation_pct}%` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mostBought.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              Mais comprados
            </h2>
            <Link href="/products" className="text-xs text-emerald-600 font-medium">
              Catálogo
            </Link>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {mostBought.map((p) => (
              <li key={p.product_id}>
                {p.product_name}
                <span className="text-slate-400 text-xs ml-1">
                  ({p.times_bought}×
                  {p.last_price != null ? ` · últ. ${formatBRL(Number(p.last_price))}` : ""})
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Link
        href="/history"
        className="block text-center text-sm text-emerald-600 font-medium py-2"
      >
        Ver histórico de compras →
      </Link>
    </div>
  );
}
