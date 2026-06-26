import { ClickableCard } from "@/components/dashboard/ClickableCard";
import { DashboardCommunityTeaser } from "@/components/dashboard/DashboardCommunityTeaser";
import { DashboardToolsCard } from "@/components/dashboard/DashboardToolsCard";
import { PersonalDropsCard } from "@/components/dashboard/PersonalDropsCard";
import { RepurchaseCard } from "@/components/dashboard/RepurchaseCard";
import { getInbox } from "@/lib/notifications/inbox";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { fetchDashboardForYou } from "@/lib/dashboard/for-you";
import { fetchCommunityInsights } from "@/lib/prices/community-insights";
import type { MonthlyStats, SavingsSuggestion } from "@/types";
import { formatBRL } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, ChevronRight, Sparkles, TrendingDown } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const profileRows = await sql`select city from profiles where id = ${userId} limit 1`;
  const userCity = (profileRows[0]?.city as string | null) ?? null;

  const [monthlyRes, savingsRes, notifications, community, activeListRows, forYou] =
    await Promise.all([
      sql`select public.get_monthly_stats(${userId}::uuid) as stats`,
      sql`select public.get_savings_suggestion(${userId}::uuid) as suggestion`,
      getInbox(userId, 5),
      fetchCommunityInsights(userCity).catch(() => null),
      sql`
        select sl.id, sl.name,
          (select count(*)::int from list_items li where li.list_id = sl.id) as item_count
        from shopping_lists sl
        where sl.owner_id = ${userId}
          and sl.status = 'active'
        order by sl.updated_at desc
        limit 1
      `,
      fetchDashboardForYou(userId, userCity),
    ]);

  const unreadAlerts = notifications.filter((n) => !n.is_read);
  const monthly = (monthlyRes[0]?.stats ?? null) as MonthlyStats | null;
  const savings = (savingsRes[0]?.suggestion ?? { has_suggestion: false }) as SavingsSuggestion;
  const activeList = activeListRows[0] as
    | { id: string; name: string; item_count: number }
    | undefined;

  const lastAt = monthly?.last_purchase_at
    ? format(new Date(monthly.last_purchase_at), "dd MMM, HH:mm", { locale: ptBR })
    : null;

  const hasMonthActivity = (monthly?.trips_this_month ?? 0) > 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Início</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Suas compras e a cidade</p>
      </div>

      {activeList && (
        <Link
          href={
            activeList.item_count === 0
              ? `/lists/${activeList.id}?plan=1`
              : `/lists/${activeList.id}`
          }
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 shadow-sm hover:border-emerald-400 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Lista ativa</p>
            <p className="font-semibold text-slate-900 dark:text-white truncate">{activeList.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeList.item_count === 0
                ? "Adicionar produtos →"
                : `${activeList.item_count} itens`}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-emerald-600 shrink-0" />
        </Link>
      )}

      <RepurchaseCard items={forYou.repurchase} />

      {hasMonthActivity ? (
        <>
          <ClickableCard
            href="/habits"
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Este mês
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-slate-500 text-[10px]">Total</p>
                <p className="font-semibold text-base">{formatBRL(Number(monthly?.month_total ?? 0))}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Média</p>
                <p className="font-semibold text-base">
                  {formatBRL(Number(monthly?.avg_per_trip_month ?? 0))}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Compras</p>
                <p className="font-semibold text-base">{monthly?.trips_this_month ?? 0}</p>
              </div>
            </div>
          </ClickableCard>
          {lastAt && (
            <Link
              href="/history"
              className="flex items-center justify-between -mt-2 px-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <span>Última compra: {lastAt}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </>
      ) : (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Este mês
          </h2>
          <p className="text-xs text-slate-500">Nenhuma compra concluída este mês.</p>
          {lastAt && (
            <Link
              href="/history"
              className="block text-center text-xs text-emerald-600 font-medium mt-3 hover:underline"
            >
              Última compra: {lastAt} →
            </Link>
          )}
        </section>
      )}

      {savings.has_suggestion && savings.estimated_savings != null && savings.estimated_savings > 0 && (
        <ClickableCard
          href="/habits"
          className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 text-sm"
        >
          <p className="font-medium text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Dica de economia
          </p>
          <p className="mt-1.5 text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
            Até <strong>{formatBRL(Number(savings.estimated_savings))}</strong> comprando mais no{" "}
            <strong>{savings.best_market_name}</strong> em vez de {savings.worst_market_name}.
          </p>
        </ClickableCard>
      )}

      <PersonalDropsCard items={forYou.personalDrops} />

      <DashboardCommunityTeaser city={userCity} data={community} />

      {unreadAlerts.length > 0 && (
        <Link
          href="/alerts"
          className="flex items-center gap-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm"
        >
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="flex-1 text-amber-900 dark:text-amber-200 font-medium">
            {unreadAlerts.length}{" "}
            {unreadAlerts.length === 1 ? "nova notificação" : "novas notificações"}
          </span>
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </Link>
      )}

      <DashboardToolsCard />
    </div>
  );
}
