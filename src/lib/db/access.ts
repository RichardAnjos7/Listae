import { getSql } from "@/lib/db";

export async function userCanAccessList(listId: string, userId: string) {
  const sql = getSql();
  const rows = await sql`
    select public.user_can_access_list(${listId}::uuid, ${userId}::uuid) as ok
  `;
  return Boolean(rows[0]?.ok);
}

export async function requireListAccess(listId: string, userId: string) {
  const ok = await userCanAccessList(listId, userId);
  if (!ok) throw new Error("Sem permissão para esta lista");
}
