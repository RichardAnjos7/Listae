"use server";

import { requireUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createSupermarket(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome obrigatório");

  await sql`
    insert into supermarkets (name, user_id, address)
    values (
      ${name},
      ${userId},
      ${String(formData.get("address") ?? "").trim() || null}
    )
  `;
  revalidatePath("/lists/new");
  revalidatePath("/");
}
