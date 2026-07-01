import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";

export const SUPER_DEV_USERNAME = "super_dev";

export async function isSuperDev(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const sql = getSql();
  const rows = await sql`
    select username, is_admin from users where id = ${userId} limit 1
  `;
  const row = rows[0] as { username: string | null; is_admin?: boolean } | undefined;
  if (!row) return false;
  return Boolean(row.is_admin) || row.username === SUPER_DEV_USERNAME;
}

export async function requireSuperDev(): Promise<string> {
  const userId = await requireUserId();
  if (!(await isSuperDev(userId))) {
    throw new Error("Acesso restrito ao administrador.");
  }
  return userId;
}

export async function getSuperDevUserIds(): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    select id from users where is_admin = true or username = ${SUPER_DEV_USERNAME}
  `;
  return rows.map((r) => r.id as string);
}
