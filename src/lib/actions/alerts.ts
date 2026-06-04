"use server";

import { requireUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/actions/profile";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type PriceAlertRow = {
  id: string;
  product_id: string;
  product_name: string;
  city: string | null;
  alert_type: "below_price" | "rise_pct";
  target_price: number | null;
  threshold_pct: number | null;
  is_active: boolean;
  created_at: string;
};

export type AlertNotificationRow = {
  id: string;
  message: string;
  observed_price: number | null;
  is_read: boolean;
  created_at: string;
  product_name: string;
};

export async function createPriceAlert(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();

  const productId = String(formData.get("product_id") ?? "").trim();
  const alertType = String(formData.get("alert_type") ?? "").trim() as "below_price" | "rise_pct";
  const cityInput = String(formData.get("city") ?? "").trim();

  if (!productId) throw new Error("Selecione um produto");
  if (alertType !== "below_price" && alertType !== "rise_pct") {
    throw new Error("Tipo de alerta inválido");
  }

  const profile = await getProfile(userId);
  const city = cityInput || profile?.city || null;

  if (alertType === "below_price") {
    const target = Number.parseFloat(String(formData.get("target_price") ?? "").replace(",", "."));
    if (!target || target <= 0) throw new Error("Informe o preço alvo");

    await sql`
      insert into price_alerts (user_id, product_id, city, alert_type, target_price)
      values (${userId}, ${productId}, ${city}, 'below_price', ${target})
      on conflict (user_id, product_id, alert_type)
      do update set
        city = excluded.city,
        target_price = excluded.target_price,
        is_active = true,
        last_triggered_at = null
    `;
  } else {
    const threshold = Number.parseFloat(String(formData.get("threshold_pct") ?? "10").replace(",", "."));
    if (!threshold || threshold <= 0) throw new Error("Informe o percentual");

    await sql`
      insert into price_alerts (user_id, product_id, city, alert_type, threshold_pct)
      values (${userId}, ${productId}, ${city}, 'rise_pct', ${threshold})
      on conflict (user_id, product_id, alert_type)
      do update set
        city = excluded.city,
        threshold_pct = excluded.threshold_pct,
        is_active = true,
        last_triggered_at = null
    `;
  }

  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function togglePriceAlert(alertId: string, active: boolean) {
  const userId = await requireUserId();
  const sql = getSql();
  await sql`
    update price_alerts
    set is_active = ${active}
    where id = ${alertId} and user_id = ${userId}
  `;
  revalidatePath("/alerts");
}

export async function deletePriceAlert(alertId: string) {
  const userId = await requireUserId();
  const sql = getSql();
  await sql`delete from price_alerts where id = ${alertId} and user_id = ${userId}`;
  revalidatePath("/alerts");
}

export async function markNotificationRead(notificationId: string) {
  const userId = await requireUserId();
  const sql = getSql();
  await sql`
    update price_alert_notifications
    set is_read = true
    where id = ${notificationId} and user_id = ${userId}
  `;
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();
  const sql = getSql();
  await sql`
    update price_alert_notifications
    set is_read = true
    where user_id = ${userId} and is_read = false
  `;
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function getUserAlerts(userId: string): Promise<PriceAlertRow[]> {
  const sql = getSql();
  const rows = await sql`
    select
      pa.id,
      pa.product_id,
      p.name as product_name,
      pa.city,
      pa.alert_type,
      pa.target_price,
      pa.threshold_pct,
      pa.is_active,
      pa.created_at
    from price_alerts pa
    join products p on p.id = pa.product_id
    where pa.user_id = ${userId}
    order by pa.created_at desc
  `;
  return rows.map((r) => ({
    id: r.id as string,
    product_id: r.product_id as string,
    product_name: r.product_name as string,
    city: r.city as string | null,
    alert_type: r.alert_type as "below_price" | "rise_pct",
    target_price: r.target_price != null ? Number(r.target_price) : null,
    threshold_pct: r.threshold_pct != null ? Number(r.threshold_pct) : null,
    is_active: Boolean(r.is_active),
    created_at: r.created_at as string,
  }));
}

export async function getUserNotifications(
  userId: string,
  limit = 20
): Promise<AlertNotificationRow[]> {
  const sql = getSql();
  const rows = await sql`
    select
      n.id,
      n.message,
      n.observed_price,
      n.is_read,
      n.created_at,
      p.name as product_name
    from price_alert_notifications n
    join products p on p.id = n.product_id
    where n.user_id = ${userId}
    order by n.created_at desc
    limit ${limit}
  `;
  return rows.map((r) => ({
    id: r.id as string,
    message: r.message as string,
    observed_price: r.observed_price != null ? Number(r.observed_price) : null,
    is_read: Boolean(r.is_read),
    created_at: r.created_at as string,
    product_name: r.product_name as string,
  }));
}
