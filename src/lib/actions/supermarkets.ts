"use server";

import { requireSuperDev } from "@/lib/auth/super-dev";
import { requireUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/actions/profile";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createSupermarket(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome obrigatório");

  const address = String(formData.get("address") ?? "").trim() || null;
  const chainId = String(formData.get("chain_id") ?? "").trim() || null;
  const cityInput = String(formData.get("city") ?? "").trim();
  const neighborhoodInput = String(formData.get("neighborhood") ?? "").trim();

  const profile = await getProfile(userId);
  const city = cityInput || profile?.city || null;
  const neighborhood = neighborhoodInput || profile?.neighborhood || null;

  let storeLocationId: string | null = null;
  if (chainId && city) {
    const locRows = await sql`
      select public.resolve_store_location_for_supermarket(
        ${chainId}::uuid,
        ${name},
        ${city},
        ${neighborhood}
      ) as store_location_id
    `;
    storeLocationId = (locRows[0]?.store_location_id as string | null) ?? null;
  }

  await sql`
    insert into supermarkets (
      name, user_id, address, chain_id, city, neighborhood, store_location_id
    )
    values (
      ${name},
      ${userId},
      ${address},
      ${chainId},
      ${city},
      ${neighborhood},
      ${storeLocationId}
    )
  `;

  revalidatePath("/lists/new");
  revalidatePath("/");
  revalidatePath("/profile");
}

export async function updateSupermarket(formData: FormData) {
  await requireSuperDev();
  const sql = getSql();

  const supermarketId = String(formData.get("supermarket_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!supermarketId) throw new Error("Mercado inválido");
  if (!name) throw new Error("Nome obrigatório");

  await sql`
    update supermarkets
    set name = ${name}
    where id = ${supermarketId}
  `;

  revalidatePath("/lists/new");
  revalidatePath("/");
}

export async function deleteSupermarket(formData: FormData) {
  await requireSuperDev();
  const sql = getSql();

  const supermarketId = String(formData.get("supermarket_id") ?? "").trim();
  if (!supermarketId) throw new Error("Mercado inválido");

  const inUse = await sql`
    select exists(select 1 from shopping_lists where supermarket_id = ${supermarketId}) as used
  `;
  if (Boolean(inUse[0]?.used)) {
    throw new Error("Mercado vinculado a listas — não pode ser excluído.");
  }

  await sql`delete from supermarkets where id = ${supermarketId}`;

  revalidatePath("/lists/new");
  revalidatePath("/");
}

export async function updateSupermarketFromForm(formData: FormData) {
  await updateSupermarket(formData);
  const { redirect } = await import("next/navigation");
  redirect("/lists/new?market_updated=1");
}

export async function deleteSupermarketFromForm(formData: FormData) {
  await deleteSupermarket(formData);
  const { redirect } = await import("next/navigation");
  redirect("/lists/new?market_deleted=1");
}
