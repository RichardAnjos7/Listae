import { getSql } from "@/lib/db";
import { recordNotification } from "@/lib/notifications/inbox";
import {
  getNotificationContext,
  isWithinQuietHours,
  type NotificationType,
} from "@/lib/notifications/preferences";
import { sendPushToUser, type PushPayload } from "@/lib/push/web-push";

type DispatchOptions = {
  userId: string;
  type: NotificationType;
  payload: PushPayload;
  /**
   * Se informado, a notificação só é enviada uma vez por chave (anti-spam).
   * Embuta a janela de tempo na chave (ex.: `repurchase:<produto>:2026-06`).
   */
  dedupeKey?: string;
};

/**
 * Envia um push respeitando a preferência do usuário para o tipo e,
 * opcionalmente, evitando reenvio via `notification_log`.
 * Retorna quantos dispositivos receberam (0 se bloqueado por preferência/dedupe).
 */
export async function dispatchPush({
  userId,
  type,
  payload,
  dedupeKey,
}: DispatchOptions): Promise<number> {
  const { prefs, quiet } = await getNotificationContext(userId);
  if (!prefs[type]) return 0;

  if (dedupeKey) {
    const sql = getSql();
    try {
      const inserted = await sql`
        insert into notification_log (user_id, dedupe_key)
        values (${userId}, ${dedupeKey})
        on conflict (user_id, dedupe_key) do nothing
        returning id
      `;
      if (inserted.length === 0) return 0;
    } catch {
      // Se o log falhar, seguimos enviando (melhor entregar do que perder).
    }
  }

  // Registra na central in-app (exceto alertas de preço, que já são
  // persistidos em price_alert_notifications). Feito antes do silêncio:
  // o horário de silêncio suprime só o push, não o item no inbox.
  if (type !== "price_alert") {
    await recordNotification({
      userId,
      type,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
    });
  }

  if (isWithinQuietHours(quiet)) return 0;

  return sendPushToUser(userId, payload);
}
