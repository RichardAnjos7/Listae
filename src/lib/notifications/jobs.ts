import { getSql } from "@/lib/db";
import { dispatchPush } from "@/lib/notifications/dispatch";

function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function isoWeekKey(d = new Date()): string {
  // ISO week number (segunda-feira como início)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

type CandidateUser = { userId: string; city: string | null };

/** Usuários com pelo menos uma inscrição push ativa (só esses interessam). */
async function getPushUsers(): Promise<CandidateUser[]> {
  const sql = getSql();
  const rows = await sql`
    select distinct ps.user_id, p.city
    from push_subscriptions ps
    left join profiles p on p.id = ps.user_id
  `;
  return rows.map((r) => ({
    userId: r.user_id as string,
    city: (r.city as string | null) ?? null,
  }));
}

/** Lembretes de recompra: produtos que o usuário costuma comprar nesta época. */
export async function runRepurchaseReminders(): Promise<number> {
  const sql = getSql();
  const users = await getPushUsers();
  const mk = monthKey();
  let sent = 0;

  for (const { userId } of users) {
    let rows: { product_id: string; product_name: string }[];
    try {
      rows = (await sql`
        select product_id, product_name
        from public.get_repurchase_suggestions(${userId}::uuid, ${3})
      `) as { product_id: string; product_name: string }[];
    } catch {
      continue;
    }
    if (rows.length === 0) continue;

    const top = rows[0];
    const extra = rows.length - 1;
    const body =
      extra > 0
        ? `${top.product_name} e mais ${extra} ${extra === 1 ? "item" : "itens"} que você costuma recomprar`
        : `${top.product_name} — você costuma comprar nesta época`;

    sent += await dispatchPush({
      userId,
      type: "repurchase",
      payload: {
        title: "Hora de recomprar",
        body,
        url: "/",
        tag: "repurchase",
      },
      dedupeKey: `repurchase:${top.product_id}:${mk}`,
    });
  }

  return sent;
}

/** Quedas de preço em produtos que o usuário já comprou, na cidade dele. */
export async function runPersonalDropReminders(): Promise<number> {
  const sql = getSql();
  const users = await getPushUsers();
  const wk = isoWeekKey();
  let sent = 0;

  for (const { userId, city } of users) {
    let rows: {
      product_id: string;
      product_name: string;
      store_name: string;
      drop_pct: number | null;
    }[];
    try {
      rows = (await sql`
        select product_id, product_name, store_name, drop_pct
        from public.get_personal_price_drops(${userId}::uuid, ${city}, ${3})
      `) as {
        product_id: string;
        product_name: string;
        store_name: string;
        drop_pct: number | null;
      }[];
    } catch {
      continue;
    }

    const meaningful = rows.filter((r) => Number(r.drop_pct ?? 0) >= 8);
    if (meaningful.length === 0) continue;

    const top = meaningful[0];
    const pct = Number(top.drop_pct ?? 0).toFixed(0);
    const body = `${top.product_name} caiu ${pct}% no ${top.store_name}`;

    sent += await dispatchPush({
      userId,
      type: "price_drop",
      payload: {
        title: "Queda de preço",
        body,
        url: "/prices",
        tag: "price-drop",
      },
      dedupeKey: `drop:${top.product_id}:${wk}`,
    });
  }

  return sent;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type MonthlyStats = {
  month_total: number;
  trips_this_month: number;
};
type SavingsSuggestion = {
  has_suggestion: boolean;
  best_market_name?: string;
  estimated_savings?: number;
};

/** Resumo do mês: total gasto, nº de compras e dica de economia. */
export async function runMonthlySummary(): Promise<number> {
  const sql = getSql();
  const users = await getPushUsers();
  const mk = monthKey();
  let sent = 0;

  for (const { userId } of users) {
    let stats: MonthlyStats | null = null;
    let savings: SavingsSuggestion = { has_suggestion: false };
    try {
      const [statsRes, savingsRes] = await Promise.all([
        sql`select public.get_monthly_stats(${userId}::uuid) as s`,
        sql`select public.get_savings_suggestion(${userId}::uuid) as s`,
      ]);
      stats = (statsRes[0]?.s ?? null) as MonthlyStats | null;
      savings = (savingsRes[0]?.s ?? { has_suggestion: false }) as SavingsSuggestion;
    } catch {
      continue;
    }

    const trips = Number(stats?.trips_this_month ?? 0);
    if (trips === 0) continue;

    const total = Number(stats?.month_total ?? 0);
    let body = `${trips} ${trips === 1 ? "compra" : "compras"} neste mês · ${formatBRL(total)}`;
    if (
      savings.has_suggestion &&
      savings.estimated_savings != null &&
      Number(savings.estimated_savings) > 0
    ) {
      body += `. Dá pra economizar até ${formatBRL(Number(savings.estimated_savings))} no ${savings.best_market_name}.`;
    }

    sent += await dispatchPush({
      userId,
      type: "monthly_summary",
      payload: {
        title: "Seu mês no Listaê",
        body,
        url: "/habits",
        tag: "monthly-summary",
      },
      dedupeKey: `monthly:${mk}`,
    });
  }

  return sent;
}

/** Resumo semanal: recompras sugeridas + quedas de preço. */
export async function runWeeklyDigest(): Promise<number> {
  const sql = getSql();
  const users = await getPushUsers();
  const wk = isoWeekKey();
  let sent = 0;

  for (const { userId, city } of users) {
    let repurchaseCount = 0;
    let dropsCount = 0;
    try {
      const [rep, drops] = await Promise.all([
        sql`select count(*)::int as c from public.get_repurchase_suggestions(${userId}::uuid, ${20})`,
        sql`select count(*)::int as c from public.get_personal_price_drops(${userId}::uuid, ${city}, ${20})`,
      ]);
      repurchaseCount = Number(rep[0]?.c ?? 0);
      dropsCount = Number(drops[0]?.c ?? 0);
    } catch {
      continue;
    }

    if (repurchaseCount === 0 && dropsCount === 0) continue;

    const parts: string[] = [];
    if (repurchaseCount > 0) {
      parts.push(`${repurchaseCount} ${repurchaseCount === 1 ? "recompra sugerida" : "recompras sugeridas"}`);
    }
    if (dropsCount > 0) {
      parts.push(`${dropsCount} ${dropsCount === 1 ? "queda de preço" : "quedas de preço"}`);
    }
    const body = `Esta semana: ${parts.join(" e ")}. Abra para conferir.`;

    sent += await dispatchPush({
      userId,
      type: "weekly_digest",
      payload: {
        title: "Seu resumo Listaê",
        body,
        url: "/",
        tag: "weekly-digest",
      },
      dedupeKey: `digest:${wk}`,
    });
  }

  return sent;
}
