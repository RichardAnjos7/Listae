import { CityCommunityLive } from "@/components/prices/CityCommunityLive";
import { getUserNotifications } from "@/lib/actions/alerts";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { fetchCommunityInsights } from "@/lib/prices/community-insights";
import type { MonthlyStats, SavingsSuggestion } from "@/types";
import { formatBRL } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Minus,
  ScanLine,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const profileRows = await sql`select city from profiles where id = ${userId} limit 1`;
  const userCity = (profileRows[0]?.city as string | null) ?? null;

  const [mostRes, varRes, marketsRes, monthlyRes, savingsRes, notifications, community] =
    await Promise.all([
    sql`select * from public.get_most_bought_products(${userId}::uuid, ${8})`,
    sql`select * from public.get_price_variations(${userId}::uuid, ${8})`,
    sql`select * from public.compare_supermarket_prices(${userId}::uuid)`,
    sql`select public.get_monthly_stats(${userId}::uuid) as stats`,
    sql`select public.get_savings_suggestion(${userId}::uuid) as suggestion`,
    getUserNotifications(userId, 5),
    fetchCommunityInsights(userCity).catch(() => null),
  ]);

  const unreadAlerts = notifications.filter((n) => !n.is_read);

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

  const lastAt = monthly?.last_purchase_at
    ? format(new Date(monthly.last_purchase_at), "dd MMM yyyy, HH:mm", { locale: ptBR })
    : null;

  const minMarketAvg =
    markets.length > 0 ? Math.min(...markets.map((m) => Number(m.avg_total))) : null;

  function marketVsCheapest(avgTotal: number): { pct: number | null; direction: "up" | "down" | "flat" } {
    if (minMarketAvg == null || minMarketAvg <= 0 || markets.length < 2) {
      return { pct: null, direction: "flat" };
    }
    if (avgTotal <= minMarketAvg) return { pct: 0, direction: "flat" };
    const pct = Math.round(((avgTotal - minMarketAvg) / minMarketAvg) * 1000) / 10;
    return { pct, direction: "up" };
  }

  function lastVsAvg(
    lastTotal: number | null,
    avgTotal: number,
    tripCount: number
  ): { pct: number | null; direction: "up" | "down" | "flat" } {
    if (lastTotal == null || tripCount < 2 || avgTotal <= 0) {
      return { pct: null, direction: "flat" };
    }
    const pct = Math.round(((lastTotal - avgTotal) / avgTotal) * 1000) / 10;
    if (pct === 0) return { pct: 0, direction: "flat" };
    return { pct: Math.abs(pct), direction: pct > 0 ? "up" : "down" };
  }

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Economia e hábitos de compra
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Resumo do mês
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Total no mês</p>
            <p className="font-semibold text-lg">{formatBRL(Number(monthly?.month_total ?? 0))}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Média por compra</p>
            <p className="font-semibold text-lg">{formatBRL(Number(monthly?.avg_per_trip_month ?? 0))}</p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-500 text-xs">Compras concluídas (mês)</p>
            <p className="font-medium">{monthly?.trips_this_month ?? 0}</p>
          </div>
          {lastAt && (
            <div className="col-span-2 text-xs text-slate-500">
              Última compra: <span className="text-slate-700 dark:text-slate-300">{lastAt}</span>
            </div>
          )}
        </div>
      </section>

      {community && (
        <CityCommunityLive city={userCity} initialData={community} compact />
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
            <strong>{savings.best_market_name}</strong> em vez de <strong>{savings.worst_market_name}</strong>{" "}
            (média histórica das suas compras).
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Comparação entre mercados</h2>
        {markets.length === 0 ? (
          <p className="text-xs text-slate-500">
            Conclua listas com supermercado escolhido para ver médias e comparações.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {markets.map((m) => {
              const vsCheapest = marketVsCheapest(Number(m.avg_total));
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
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Variação de preço (último vs anterior)</h2>
        {variations.length === 0 ? (
          <p className="text-xs text-slate-500">Sem histórico suficiente ainda.</p>
        ) : (
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
        )}
      </section>

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
        {mostBought.length === 0 ? (
          <p className="text-xs text-slate-500">Suas compras concluídas alimentam este ranking.</p>
        ) : (
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
        )}
      </section>

      <section className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas de preço
          </p>
          <Link href="/alerts" className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Gerenciar
          </Link>
        </div>
        <ul className="mt-2 space-y-1 text-amber-800 dark:text-amber-300 text-xs">
          {unreadAlerts.length > 0 ? (
            unreadAlerts.map((n) => (
              <li key={n.id}>
                {n.message}
              </li>
            ))
          ) : variations.filter((v) => v.direction === "up" && (v.variation_pct ?? 0) > 5).length ===
            0 ? (
            <li>Nenhum alerta novo. Crie em Alertas ou acompanhe variações abaixo.</li>
          ) : (
            variations
              .filter((v) => v.direction === "up" && (v.variation_pct ?? 0) > 5)
              .map((v) => (
                <li key={v.product_id}>
                  <strong>{v.product_name}</strong> subiu {v.variation_pct}% (suas compras)
                </li>
              ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-emerald-600" />
          Nota fiscal
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Tire foto do cupom e importe preços automaticamente (OCR).
        </p>
        <Link
          href="/receipt"
          className="block text-center rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 font-medium py-2.5 text-sm"
        >
          Escanear nota
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Preços na cidade</h2>
        <p className="text-xs text-slate-500 mb-3">
          Compare produtos na base compartilhada (arroz, leite, óleo…).
        </p>
        <Link
          href="/prices"
          className="block text-center rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium py-2.5 text-sm hover:opacity-90 transition-opacity"
        >
          Buscar preços
        </Link>
      </section>

      <div className="flex gap-2">
        <Link
          href="/lists/new"
          className="flex-1 text-center rounded-xl bg-emerald-600 text-white font-medium py-3 text-sm hover:bg-emerald-700 transition-colors"
        >
          Nova lista
        </Link>
        <Link
          href="/lists"
          className="flex-1 text-center rounded-xl border border-slate-300 dark:border-slate-600 font-medium py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Minhas listas
        </Link>
      </div>
    </div>
  );
}
