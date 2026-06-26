import webpush, { type PushSubscription } from "web-push";
import { getSql } from "@/lib/db";

let configured = false;

function clean(value: string | undefined): string | null {
  const v = value?.trim().replace(/^["']|["']$/g, "");
  return v && v.length > 0 ? v : null;
}

export function getVapidPublicKey(): string | null {
  return clean(process.env.VAPID_PUBLIC_KEY);
}

export function isPushConfigured(): boolean {
  return Boolean(clean(process.env.VAPID_PUBLIC_KEY) && clean(process.env.VAPID_PRIVATE_KEY));
}

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = clean(process.env.VAPID_PUBLIC_KEY);
  const privateKey = clean(process.env.VAPID_PRIVATE_KEY);
  const subject = clean(process.env.VAPID_SUBJECT) ?? "mailto:contato@listae.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Quantidade exibida no ícone do app (Badging API). */
  badge?: number;
  icon?: string;
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

async function sendToSubscription(row: SubRow, payload: PushPayload): Promise<boolean> {
  const subscription: PushSubscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404/410: inscrição expirou ou foi removida no navegador — limpa do banco.
    if (statusCode === 404 || statusCode === 410) {
      try {
        await getSql()`delete from push_subscriptions where id = ${row.id}`;
      } catch {
        /* ignore */
      }
    }
    return false;
  }
}

/** Envia um push para todos os dispositivos inscritos de um usuário. Retorna quantos foram entregues. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const sql = getSql();
  const rows = (await sql`
    select id, endpoint, p256dh, auth
    from push_subscriptions
    where user_id = ${userId}
  `) as SubRow[];
  if (rows.length === 0) return 0;

  const results = await Promise.all(rows.map((r) => sendToSubscription(r, payload)));
  const delivered = results.filter(Boolean).length;
  if (delivered > 0) {
    try {
      await sql`update push_subscriptions set last_used_at = now() where user_id = ${userId}`;
    } catch {
      /* ignore */
    }
  }
  return delivered;
}
