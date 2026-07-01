"use server";

import { requireSuperDev, SUPER_DEV_USERNAME } from "@/lib/auth/super-dev";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AdminUserRow = {
  id: string;
  username: string | null;
  name: string;
  is_admin: boolean;
  is_root: boolean;
};

async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const sql = getSql();
  const rows = await sql`
    select u.id, u.username, coalesce(p.name, '') as name, u.is_admin
    from users u
    left join profiles p on p.id = u.id
    where u.is_admin = true
    order by u.username nulls last
  `;
  return rows.map((r) => ({
    id: r.id as string,
    username: r.username as string | null,
    name: r.name as string,
    is_admin: Boolean(r.is_admin),
    is_root: (r.username as string | null) === SUPER_DEV_USERNAME,
  }));
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  await requireSuperDev();
  return fetchAdminUsers();
}

export async function searchUsersForAdmin(query: string): Promise<AdminUserRow[]> {
  await requireSuperDev();
  const q = query.trim();
  if (q.length < 2) return [];

  const sql = getSql();
  const pattern = `%${q}%`;
  const rows = await sql`
    select u.id, u.username, coalesce(p.name, '') as name, u.is_admin
    from users u
    left join profiles p on p.id = u.id
    where u.username ilike ${pattern}
       or coalesce(p.name, '') ilike ${pattern}
    order by u.is_admin desc, u.username nulls last
    limit 20
  `;
  return rows.map((r) => ({
    id: r.id as string,
    username: r.username as string | null,
    name: r.name as string,
    is_admin: Boolean(r.is_admin),
    is_root: (r.username as string | null) === SUPER_DEV_USERNAME,
  }));
}

async function setUserAdmin(targetUserId: string, isAdmin: boolean, actorUserId: string) {
  await requireSuperDev();
  const sql = getSql();

  if (!targetUserId) throw new Error("Usuário inválido.");

  const targetRows = await sql`
    select id, username, is_admin from users where id = ${targetUserId}::uuid limit 1
  `;
  const target = targetRows[0] as
    | { id: string; username: string | null; is_admin: boolean }
    | undefined;
  if (!target) throw new Error("Usuário não encontrado.");

  const isRoot = target.username === SUPER_DEV_USERNAME;

  if (isAdmin) {
    if (target.is_admin) return;
    await sql`update users set is_admin = true where id = ${targetUserId}::uuid`;
    return;
  }

  if (isRoot) {
    throw new Error("O usuário raiz não pode perder privilégios de admin.");
  }

  if (!target.is_admin) return;

  if (targetUserId === actorUserId) {
    const others = await sql`
      select count(*)::int as n
      from users
      where is_admin = true and id <> ${targetUserId}::uuid
    `;
    if ((others[0]?.n as number) < 1) {
      throw new Error("Deve haver pelo menos um administrador.");
    }
  } else {
    const total = await sql`select count(*)::int as n from users where is_admin = true`;
    if ((total[0]?.n as number) <= 1) {
      throw new Error("Deve haver pelo menos um administrador.");
    }
  }

  await sql`update users set is_admin = false where id = ${targetUserId}::uuid`;
}

export async function promoteUserFromForm(formData: FormData) {
  const actorUserId = await requireSuperDev();
  const userId = String(formData.get("user_id") ?? "").trim();
  await setUserAdmin(userId, true, actorUserId);
  revalidatePath("/profile");
  redirect("/profile?admin_promoted=1");
}

export async function demoteUserFromForm(formData: FormData) {
  const actorUserId = await requireSuperDev();
  const userId = String(formData.get("user_id") ?? "").trim();
  await setUserAdmin(userId, false, actorUserId);
  revalidatePath("/profile");
  redirect("/profile?admin_demoted=1");
}
