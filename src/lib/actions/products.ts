"use server";

import { requireUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  package_size: string | null;
  barcode: string | null;
  category_id: string | null;
  is_global: boolean;
};

export async function searchCatalogProducts(
  query: string,
  categoryId?: string | null
): Promise<CatalogProduct[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const userId = await requireUserId();
  const sql = getSql();

  const rows = await sql`
    select id, name, brand, unit, package_size, barcode, category_id, is_global
    from public.search_catalog_products(${q}, ${userId}::uuid, ${20})
  `;

  let results = rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    brand: r.brand as string | null,
    unit: r.unit as string,
    package_size: r.package_size as string | null,
    barcode: r.barcode as string | null,
    category_id: r.category_id as string | null,
    is_global: Boolean(r.is_global),
  }));

  if (categoryId) {
    results = results.filter((p) => p.category_id === categoryId);
  }

  return results;
}

export async function findProductByBarcode(barcode: string): Promise<CatalogProduct | null> {
  const code = barcode.trim();
  if (!code) return null;

  const sql = getSql();
  const rows = await sql`
    select id, name, brand, unit, package_size, barcode, category_id, is_global
    from products
    where barcode = ${code}
    limit 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as string,
    name: r.name as string,
    brand: r.brand as string | null,
    unit: r.unit as string,
    package_size: r.package_size as string | null,
    barcode: r.barcode as string | null,
    category_id: r.category_id as string | null,
    is_global: Boolean(r.is_global),
  };
}

export async function createCatalogProduct(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();

  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const unit = String(formData.get("unit") ?? "").trim() || "un";
  const packageSize = String(formData.get("package_size") ?? "").trim() || null;
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;

  if (!name) throw new Error("Nome do produto é obrigatório");

  if (barcode) {
    const existing = await findProductByBarcode(barcode);
    if (existing) {
      throw new Error(`EAN ${barcode} já cadastrado: ${existing.name}`);
    }
  }

  await sql`
    insert into products (name, brand, unit, package_size, barcode, category_id, is_global, created_by)
    values (
      ${name},
      ${brand},
      ${unit},
      ${packageSize},
      ${barcode},
      ${categoryId},
      true,
      ${userId}
    )
  `;

  revalidatePath("/products");
}
