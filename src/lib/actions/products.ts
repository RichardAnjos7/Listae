"use server";

import { requireSuperDev } from "@/lib/auth/super-dev";
import { requireUserId } from "@/lib/auth/session";
import { inferFromDictionary } from "@/lib/catalog/infer-product";
import { parsePackageSize, parsePackageFromForm } from "@/lib/catalog/units";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ProductAttributeSuggestion = {
  unit: string | null;
  categoryId: string | null;
  categoryName: string | null;
  packageAmount: string | null;
  source: "catalog" | "dictionary" | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  package_size: string | null;
  barcode: string | null;
  category_id: string | null;
  subcategory: string | null;
  image_url: string | null;
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
    select id, name, brand, unit, package_size, barcode, category_id, subcategory, image_url, is_global
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
    subcategory: r.subcategory as string | null,
    image_url: r.image_url as string | null,
    is_global: Boolean(r.is_global),
  }));

  if (categoryId) {
    results = results.filter((p) => p.category_id === categoryId);
  }

  return results;
}

export async function suggestProductAttributes(name: string): Promise<ProductAttributeSuggestion> {
  const q = name.trim();
  const empty: ProductAttributeSuggestion = {
    unit: null,
    categoryId: null,
    categoryName: null,
    packageAmount: null,
    source: null,
  };
  if (q.length < 2) return empty;

  const sql = getSql();
  const catalogRows = await sql`
    select
      p.unit,
      p.category_id,
      c.name as category_name,
      p.package_size
    from products p
    left join categories c on c.id = p.category_id
    where p.is_global = true
      and (
        p.name ilike ${`%${q}%`}
        or similarity(p.name, ${q}) > 0.35
      )
    order by similarity(p.name, ${q}) desc, p.name
    limit 1
  `;

  if (catalogRows[0]) {
    const row = catalogRows[0];
    const parsed = parsePackageSize(row.package_size as string | null, row.unit as string);
    return {
      unit: parsed.unit,
      categoryId: row.category_id as string | null,
      categoryName: row.category_name as string | null,
      packageAmount: parsed.amount,
      source: "catalog",
    };
  }

  const dict = inferFromDictionary(q);
  if (!dict) return empty;

  const categoryRows = await sql`
    select id, name from categories where name = ${dict.categoryName} limit 1
  `;
  const categoryId = (categoryRows[0]?.id as string | null) ?? null;

  return {
    unit: dict.unit,
    categoryId,
    categoryName: dict.categoryName,
    packageAmount: dict.packageAmount,
    source: "dictionary",
  };
}

export async function findProductByBarcode(barcode: string): Promise<CatalogProduct | null> {
  const code = barcode.trim();
  if (!code) return null;

  const sql = getSql();
  const rows = await sql`
    select id, name, brand, unit, package_size, barcode, category_id, subcategory, image_url, is_global
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
    subcategory: r.subcategory as string | null,
    image_url: r.image_url as string | null,
    is_global: Boolean(r.is_global),
  };
}

function readProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const { unit, packageSize } = parsePackageFromForm(formData);

  if (!name) throw new Error("Nome do produto é obrigatório");
  if (!categoryId) throw new Error("Selecione uma categoria");

  return { name, brand, unit, packageSize, categoryId };
}

export async function createCatalogProduct(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();
  const { name, brand, unit, packageSize, categoryId } = readProductForm(formData);

  await sql`
    insert into products (name, brand, unit, package_size, barcode, category_id, is_global, created_by)
    values (
      ${name},
      ${brand},
      ${unit},
      ${packageSize},
      null,
      ${categoryId},
      true,
      ${userId}
    )
  `;

  revalidatePath("/products");
}

export async function updateCatalogProduct(formData: FormData) {
  await requireSuperDev();
  const sql = getSql();

  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) throw new Error("Produto inválido");

  const { name, brand, unit, packageSize, categoryId } = readProductForm(formData);

  await sql`
    update products
    set
      name = ${name},
      brand = ${brand},
      unit = ${unit},
      package_size = ${packageSize},
      category_id = ${categoryId}
    where id = ${productId}
  `;

  revalidatePath("/products");
}

export async function deleteCatalogProduct(formData: FormData) {
  await requireSuperDev();
  const sql = getSql();

  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) throw new Error("Produto inválido");

  const inUse = await sql`
    select exists(select 1 from list_items where product_id = ${productId}) as used
  `;
  if (Boolean(inUse[0]?.used)) {
    throw new Error("Produto em uso em listas — não pode ser excluído.");
  }

  await sql`delete from favorite_products where product_id = ${productId}`;
  await sql`delete from products where id = ${productId}`;

  revalidatePath("/products");
}

export async function updateCatalogProductFromForm(formData: FormData) {
  await updateCatalogProduct(formData);
  const { redirect } = await import("next/navigation");
  redirect("/products?updated=1");
}

export async function deleteCatalogProductFromForm(formData: FormData) {
  await deleteCatalogProduct(formData);
  const { redirect } = await import("next/navigation");
  redirect("/products?deleted=1");
}
