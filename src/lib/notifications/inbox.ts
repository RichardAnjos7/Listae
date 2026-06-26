import { getSql } from "@/lib/db";
import type { NotificationType } from "@/lib/notifications/preferences";

export type InboxSource = "price_alert" | "general";

export type InboxItem = {
  source: InboxSource;
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  is_read: boolean;
  created_at: string;
};

/**
 * Persiste uma notificação geral (não-alerta-de-preço) na central in-app.
 * Best-effort: nunca lança (se a tabela não existir ainda, apenas ignora).
 */
export async function recordNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string | null;
}): Promise<void> {
  const sql = getSql();
  try {
    await sql`
      insert into notifications (user_id, type, title, body, url)
      values (${input.userId}, ${input.type}, ${input.title}, ${input.body}, ${input.url ?? null})
    `;
  } catch {
    /* tabela pode não existir antes da migração 017; não bloqueia o push */
  }
}

/** Inbox unificado: alertas de preço + notificações gerais, mais recentes primeiro. */
export async function getInbox(userId: string, limit = 30): Promise<InboxItem[]> {
  const sql = getSql();
  try {
    const rows = await sql`
      select source, id, type, title, body, url, is_read, created_at
      from (
        select
          'price_alert' as source,
          n.id::text as id,
          'price_alert' as type,
          'Alerta de preço' as title,
          n.message as body,
          '/prices'::text as url,
          n.is_read,
          n.created_at
        from price_alert_notifications n
        where n.user_id = ${userId}
        union all
        select
          'general' as source,
          g.id::text as id,
          g.type,
          g.title,
          g.body,
          g.url,
          g.is_read,
          g.created_at
        from notifications g
        where g.user_id = ${userId}
      ) t
      order by t.created_at desc
      limit ${limit}
    `;
    return rows.map(toInboxItem);
  } catch {
    // Fallback se a tabela geral ainda não existir: só alertas de preço.
    const rows = await sql`
      select
        'price_alert' as source,
        n.id::text as id,
        'price_alert' as type,
        'Alerta de preço' as title,
        n.message as body,
        '/prices'::text as url,
        n.is_read,
        n.created_at
      from price_alert_notifications n
      where n.user_id = ${userId}
      order by n.created_at desc
      limit ${limit}
    `;
    return rows.map(toInboxItem);
  }
}

export async function getUnreadInboxCount(userId: string): Promise<number> {
  const sql = getSql();
  try {
    const rows = await sql`
      select
        (select count(*) from price_alert_notifications where user_id = ${userId} and is_read = false)
        + (select count(*) from notifications where user_id = ${userId} and is_read = false) as c
    `;
    return Number(rows[0]?.c ?? 0);
  } catch {
    // Fallback se a tabela geral ainda não existir: só alertas de preço.
    try {
      const rows = await sql`
        select count(*) as c from price_alert_notifications
        where user_id = ${userId} and is_read = false
      `;
      return Number(rows[0]?.c ?? 0);
    } catch {
      return 0;
    }
  }
}

export async function markInboxItemRead(
  userId: string,
  source: InboxSource,
  id: string
): Promise<void> {
  const sql = getSql();
  if (source === "price_alert") {
    await sql`
      update price_alert_notifications set is_read = true
      where id = ${id} and user_id = ${userId}
    `;
  } else {
    await sql`
      update notifications set is_read = true
      where id = ${id} and user_id = ${userId}
    `;
  }
}

export async function markAllInboxRead(userId: string): Promise<void> {
  const sql = getSql();
  await sql`
    update price_alert_notifications set is_read = true
    where user_id = ${userId} and is_read = false
  `;
  try {
    await sql`
      update notifications set is_read = true
      where user_id = ${userId} and is_read = false
    `;
  } catch {
    /* tabela geral pode não existir ainda */
  }
}

function toInboxItem(r: Record<string, unknown>): InboxItem {
  return {
    source: r.source as InboxSource,
    id: r.id as string,
    type: r.type as string,
    title: r.title as string,
    body: r.body as string,
    url: (r.url as string | null) ?? null,
    is_read: Boolean(r.is_read),
    created_at: r.created_at as string,
  };
}
