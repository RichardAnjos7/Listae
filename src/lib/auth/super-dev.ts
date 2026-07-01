import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/session";

export const SUPER_DEV_USERNAME = "super_dev";

export async function isSuperDev(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const sql = getSql();
  const rows = await sql`
    select username from users where id = ${userId} limit 1
  `;
  return (rows[0]?.username as string | null) === SUPER_DEV_USERNAME;
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
    select id from users where username = ${SUPER_DEV_USERNAME}
  `;
  return rows.map((r) => r.id as string);
}
