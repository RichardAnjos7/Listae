"use server";

import { requireUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ProfileRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  neighborhood: string | null;
};

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const sql = getSql();
  const rows = await sql`
    select id, name, avatar_url, city, neighborhood
    from profiles
    where id = ${userId}
    limit 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as string,
    name: r.name as string,
    avatar_url: r.avatar_url as string | null,
    city: r.city as string | null,
    neighborhood: r.neighborhood as string | null,
  };
}

export async function updateProfile(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const neighborhood = String(formData.get("neighborhood") ?? "").trim() || null;

  if (!name) throw new Error("Nome é obrigatório");

  await sql`
    update profiles
    set
      name = ${name},
      city = ${city},
      neighborhood = ${neighborhood}
    where id = ${userId}
  `;

  revalidatePath("/profile");
  revalidatePath("/prices");
  revalidatePath("/lists/new");
  revalidatePath("/");
}
