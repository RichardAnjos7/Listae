import { getSql } from "@/lib/db";

export type NotificationType =
  | "price_alert"
  | "list_activity"
  | "repurchase"
  | "price_drop"
  | "weekly_digest"
  | "monthly_summary";

export type NotificationPreferences = Record<NotificationType, boolean>;

export type QuietHours = {
  enabled: boolean;
  /** Hora local de início (0-23). */
  start: number;
  /** Hora local de fim (0-23). */
  end: number;
  /** Offset do fuso do usuário em minutos (ex.: -180 = UTC-3, -240 = UTC-4). */
  offsetMinutes: number;
};

export type NotificationContext = {
  prefs: NotificationPreferences;
  quiet: QuietHours;
};

export const NOTIFICATION_TYPES: NotificationType[] = [
  "price_alert",
  "list_activity",
  "repurchase",
  "price_drop",
  "weekly_digest",
  "monthly_summary",
];

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  price_alert: true,
  list_activity: true,
  repurchase: true,
  price_drop: true,
  weekly_digest: true,
  monthly_summary: true,
};

export const DEFAULT_QUIET: QuietHours = {
  enabled: false,
  start: 22,
  end: 7,
  offsetMinutes: -180,
};

type PrefRow = {
  price_alert: boolean;
  list_activity: boolean;
  repurchase: boolean;
  price_drop: boolean;
  weekly_digest: boolean;
  monthly_summary: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: number;
  quiet_end: number;
  utc_offset_minutes: number;
};

function rowToContext(r: PrefRow | undefined): NotificationContext {
  if (!r) return { prefs: { ...DEFAULT_PREFERENCES }, quiet: { ...DEFAULT_QUIET } };
  return {
    prefs: {
      price_alert: Boolean(r.price_alert),
      list_activity: Boolean(r.list_activity),
      repurchase: Boolean(r.repurchase),
      price_drop: Boolean(r.price_drop),
      weekly_digest: Boolean(r.weekly_digest),
      monthly_summary: Boolean(r.monthly_summary),
    },
    quiet: {
      enabled: Boolean(r.quiet_hours_enabled),
      start: Number(r.quiet_start ?? DEFAULT_QUIET.start),
      end: Number(r.quiet_end ?? DEFAULT_QUIET.end),
      offsetMinutes: Number(r.utc_offset_minutes ?? DEFAULT_QUIET.offsetMinutes),
    },
  };
}

export async function getNotificationContext(userId: string): Promise<NotificationContext> {
  const sql = getSql();
  try {
    const rows = await sql`
      select
        price_alert, list_activity, repurchase, price_drop, weekly_digest, monthly_summary,
        quiet_hours_enabled, quiet_start, quiet_end, utc_offset_minutes
      from notification_preferences
      where user_id = ${userId}
      limit 1
    `;
    return rowToContext(rows[0] as PrefRow | undefined);
  } catch {
    return { prefs: { ...DEFAULT_PREFERENCES }, quiet: { ...DEFAULT_QUIET } };
  }
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  return (await getNotificationContext(userId)).prefs;
}

export async function getQuietHours(userId: string): Promise<QuietHours> {
  return (await getNotificationContext(userId)).quiet;
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const sql = getSql();
  const current = await getNotificationPreferences(userId);
  const next: NotificationPreferences = { ...current, ...patch };

  await sql`
    insert into notification_preferences (
      user_id, price_alert, list_activity, repurchase, price_drop, weekly_digest, monthly_summary, updated_at
    )
    values (
      ${userId},
      ${next.price_alert},
      ${next.list_activity},
      ${next.repurchase},
      ${next.price_drop},
      ${next.weekly_digest},
      ${next.monthly_summary},
      now()
    )
    on conflict (user_id) do update set
      price_alert = excluded.price_alert,
      list_activity = excluded.list_activity,
      repurchase = excluded.repurchase,
      price_drop = excluded.price_drop,
      weekly_digest = excluded.weekly_digest,
      monthly_summary = excluded.monthly_summary,
      updated_at = now()
  `;

  return next;
}

export async function updateQuietHours(
  userId: string,
  patch: Partial<QuietHours>
): Promise<QuietHours> {
  const sql = getSql();
  const current = await getQuietHours(userId);
  const next: QuietHours = { ...current, ...patch };

  const start = Math.max(0, Math.min(23, Math.round(next.start)));
  const end = Math.max(0, Math.min(23, Math.round(next.end)));
  const offset = Math.max(-720, Math.min(840, Math.round(next.offsetMinutes)));

  await sql`
    insert into notification_preferences (
      user_id, quiet_hours_enabled, quiet_start, quiet_end, utc_offset_minutes, updated_at
    )
    values (${userId}, ${next.enabled}, ${start}, ${end}, ${offset}, now())
    on conflict (user_id) do update set
      quiet_hours_enabled = excluded.quiet_hours_enabled,
      quiet_start = excluded.quiet_start,
      quiet_end = excluded.quiet_end,
      utc_offset_minutes = excluded.utc_offset_minutes,
      updated_at = now()
  `;

  return { enabled: next.enabled, start, end, offsetMinutes: offset };
}

/** Retorna true se o horário local do usuário está dentro do período de silêncio. */
export function isWithinQuietHours(quiet: QuietHours, now: Date = new Date()): boolean {
  if (!quiet.enabled) return false;
  if (quiet.start === quiet.end) return false;
  const localHour = new Date(now.getTime() + quiet.offsetMinutes * 60_000).getUTCHours();
  if (quiet.start < quiet.end) {
    return localHour >= quiet.start && localHour < quiet.end;
  }
  // Janela que cruza a meia-noite (ex.: 22 -> 7)
  return localHour >= quiet.start || localHour < quiet.end;
}
