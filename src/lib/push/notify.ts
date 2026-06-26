import { getSql } from "@/lib/db";
import { dispatchPush } from "@/lib/notifications/dispatch";
import { isPushConfigured } from "@/lib/push/web-push";

/**
 * Dispara Web Push para notificações de alerta de preço criadas após `sinceIso`
 * para o produto informado. Chamado logo após `evaluate_price_alerts`.
 */
export async function notifyNewPriceAlerts(productId: string, sinceIso: string): Promise<void> {
  const sql = getSql();

  let rows: { user_id: string; message: string }[];
  try {
    rows = (await sql`
      select n.user_id, n.message
      from price_alert_notifications n
      where n.product_id = ${productId}
        and n.created_at >= ${sinceIso}
      order by n.created_at asc
    `) as { user_id: string; message: string }[];
  } catch {
    return;
  }
  if (rows.length === 0) return;

  const byUser = new Map<string, string[]>();
  for (const r of rows) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r.message);
    byUser.set(r.user_id, list);
  }

  await Promise.all(
    [...byUser.entries()].map(async ([userId, messages]) => {
      let unread = messages.length;
      try {
        const { getUnreadInboxCount } = await import("@/lib/notifications/inbox");
        unread = await getUnreadInboxCount(userId);
      } catch {
        /* mantém fallback */
      }
      const body =
        messages.length === 1 ? messages[0] : `${messages.length} novos alertas de preço para você`;
      await dispatchPush({
        userId,
        type: "price_alert",
        payload: {
          title: "Alerta de preço",
          body,
          url: "/alerts",
          tag: "price-alert",
          badge: unread,
        },
      });
    })
  );
}

export type ListActivity =
  | { kind: "added"; productName: string }
  | { kind: "added_many"; count: number }
  | { kind: "checked"; productName: string }
  | { kind: "removed"; productName: string }
  | { kind: "joined" }
  | { kind: "completed"; total: number }
  | { kind: "shared" };

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Avisa os demais membros de uma lista compartilhada (dono + colaboradores,
 * exceto quem fez a ação) sobre uma mudança na lista. Não faz nada em listas
 * sem outros membros.
 */
export async function notifyListActivity(
  listId: string,
  actorId: string,
  activity: ListActivity,
  opts?: { dedupeKey?: string }
): Promise<void> {
  if (!isPushConfigured()) return;
  const sql = getSql();

  let listName = "Lista compartilhada";
  const memberIds = new Set<string>();
  try {
    const listRows = await sql`
      select name, owner_id from shopping_lists where id = ${listId} limit 1
    `;
    if (!listRows[0]) return;
    listName = (listRows[0].name as string) || listName;
    memberIds.add(listRows[0].owner_id as string);

    const collabRows = await sql`
      select user_id from list_collaborators where list_id = ${listId}
    `;
    for (const r of collabRows) memberIds.add(r.user_id as string);
  } catch {
    return;
  }

  memberIds.delete(actorId);
  if (memberIds.size === 0) return;

  let actor = "Alguém";
  try {
    const nameRows = await sql`select name from profiles where id = ${actorId} limit 1`;
    actor = (nameRows[0]?.name as string) || actor;
  } catch {
    /* mantém fallback */
  }

  let body: string;
  switch (activity.kind) {
    case "added":
      body = `${actor} adicionou ${activity.productName}`;
      break;
    case "added_many":
      body = `${actor} adicionou ${activity.count} ${activity.count === 1 ? "item" : "itens"}`;
      break;
    case "checked":
      body = `${actor} marcou ${activity.productName} como comprado`;
      break;
    case "removed":
      body = `${actor} removeu ${activity.productName}`;
      break;
    case "joined":
      body = `${actor} entrou na lista`;
      break;
    case "completed":
      body = `${actor} finalizou a compra · ${formatBRL(activity.total)}`;
      break;
    case "shared":
      body = `${actor} compartilhou um convite para entrar`;
      break;
  }

  await Promise.all(
    [...memberIds].map((uid) =>
      dispatchPush({
        userId: uid,
        type: "list_activity",
        payload: {
          title: listName,
          body,
          url: `/lists/${listId}`,
          tag: `list-${listId}`,
        },
        dedupeKey: opts?.dedupeKey,
      })
    )
  );
}
