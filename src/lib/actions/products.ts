"use server";

import { requireSuperDev } from "@/lib/auth/super-dev";
import { requireUserId } from "@/lib/auth/session";
import { inferFromDictionary, parsePackageFromName } from "@/lib/catalog/infer-product";
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
  variant_count?: number;
};

export type ProductBrandVariant = CatalogProduct & {
  last_price: number | null;
};

export type PlanningSearchResult = {
  hits: CatalogProduct[];
  genericOffer: CatalogProduct | null;
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

function mapCatalogRow(r: Record<string, unknown>): CatalogProduct {
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
    variant_count: r.variant_count != null ? Number(r.variant_count) : undefined,
  };
}

async function findGenericProduct(
  sql: ReturnType<typeof getSql>,
  name: string,
  unit: string,
  categoryId: string | null,
  userId: string
): Promise<CatalogProduct | null> {
  const rows = await sql`
    select
      p.id, p.name, p.brand, p.unit, p.package_size, p.barcode, p.category_id,
      p.subcategory, p.image_url, p.is_global,
      (select count(*)::int from products v where v.base_product_id = p.id) as variant_count
    from products p
    where p.brand is null
      and lower(trim(p.name)) = lower(trim(${name}))
      and p.unit = ${unit}
      and p.category_id is not distinct from ${categoryId}::uuid
      and (p.is_global = true or p.created_by = ${userId}::uuid)
    limit 1
  `;
  return rows[0] ? mapCatalogRow(rows[0] as Record<string, unknown>) : null;
}

export async function ensureGenericProduct(
  name: string,
  unit: string,
  categoryId: string | null
): Promise<CatalogProduct> {
  const userId = await requireUserId();
  const sql = getSql();
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Nome do produto é obrigatório");

  const existing = await findGenericProduct(sql, trimmedName, unit, categoryId, userId);
  if (existing) return existing;

  const inserted = await sql`
    insert into products (name, brand, unit, category_id, is_global, created_by)
    values (${trimmedName}, null, ${unit}, ${categoryId}, true, ${userId})
    returning id, name, brand, unit, package_size, barcode, category_id, subcategory, image_url, is_global
  `;
  const row = inserted[0] as Record<string, unknown>;
  const genericId = row.id as string;

  await sql`
    update products
    set base_product_id = ${genericId}
    where brand is not null
      and lower(trim(name)) = lower(trim(${trimmedName}))
      and unit = ${unit}
      and category_id is not distinct from ${categoryId}::uuid
      and base_product_id is null
  `;

  const variantRows = await sql`
    select count(*)::int as c from products where base_product_id = ${genericId}
  `;

  return {
    ...mapCatalogRow(row),
    variant_count: Number(variantRows[0]?.c ?? 0),
  };
}

export async function searchCatalogProductsForPlanning(
  query: string,
  categoryId?: string | null
): Promise<PlanningSearchResult> {
  const hits = await searchCatalogProducts(query, categoryId);
  const q = query.trim();
  if (q.length < 2) return { hits, genericOffer: null };

  const userId = await requireUserId();
  const sql = getSql();

  const directGeneric = await sql`
    select
      p.id, p.name, p.brand, p.unit, p.package_size, p.barcode, p.category_id,
      p.subcategory, p.image_url, p.is_global,
      (select count(*)::int from products v where v.base_product_id = p.id) as variant_count
    from public.search_catalog_products(${q}, ${userId}::uuid, ${20}) sc
    join products p on p.id = sc.id
    where p.brand is null
    order by sc.rank_score desc
    limit 1
  `;

  if (directGeneric[0]) {
    return { hits, genericOffer: mapCatalogRow(directGeneric[0] as Record<string, unknown>) };
  }

  const branded = hits.find((h) => h.brand);
  if (branded) {
    const offer = await findGenericProduct(
      sql,
      branded.name,
      branded.unit,
      branded.category_id,
      userId
    );
    if (offer) return { hits, genericOffer: offer };
  }

  const namedHit = hits[0];
  if (namedHit && !namedHit.brand) {
    return { hits, genericOffer: null };
  }

  if (namedHit?.brand) {
    return {
      hits,
      genericOffer: {
        id: "",
        name: namedHit.name,
        brand: null,
        unit: namedHit.unit,
        package_size: namedHit.package_size,
        barcode: null,
        category_id: namedHit.category_id,
        subcategory: namedHit.subcategory,
        image_url: namedHit.image_url,
        is_global: true,
        variant_count: hits.filter((h) => h.brand && h.name === namedHit.name).length || undefined,
      },
    };
  }

  return { hits, genericOffer: null };
}

export async function getProductBrandVariants(
  productId: string,
  supermarketId?: string | null
): Promise<ProductBrandVariant[]> {
  const userId = await requireUserId();
  const sql = getSql();

  const rows = await sql`
    select * from public.get_product_brand_variants(
      ${productId}::uuid,
      ${userId}::uuid,
      ${supermarketId ?? null}::uuid,
      ${30}
    )
  `;

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    brand: r.brand as string | null,
    unit: r.unit as string,
    package_size: r.package_size as string | null,
    barcode: r.barcode as string | null,
    category_id: r.category_id as string | null,
    subcategory: null,
    image_url: r.image_url as string | null,
    is_global: true,
    last_price: r.last_price != null ? Number(r.last_price) : null,
  }));
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
    const fromName = parsePackageFromName(q);
    return {
      unit: fromName?.unit ?? parsed.unit,
      categoryId: row.category_id as string | null,
      categoryName: row.category_name as string | null,
      packageAmount: fromName?.packageAmount ?? parsed.amount,
      source: "catalog",
    };
  }

  const dict = inferFromDictionary(q);
  if (!dict) {
    const fromNameOnly = parsePackageFromName(q);
    if (!fromNameOnly) return empty;
    return {
      unit: fromNameOnly.unit,
      categoryId: null,
      categoryName: null,
      packageAmount: fromNameOnly.packageAmount,
      source: "dictionary",
    };
  }

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

  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;

  return { name, brand, unit, packageSize, categoryId, imageUrl };
}

function readOptionalPriceFromForm(formData: FormData) {
  const priceRaw = String(formData.get("unit_price") ?? "").trim().replace(",", ".");
  const unitPrice = priceRaw ? Number(priceRaw) : null;
  const supermarketId = String(formData.get("supermarket_id") ?? "").trim() || null;
  const isPromotion = String(formData.get("is_promotion") ?? "") === "1";
  const validUntilRaw = String(formData.get("valid_until") ?? "").trim();

  if (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    return null;
  }

  if (isPromotion && !validUntilRaw) {
    throw new Error("Informe até quando vale a promoção");
  }

  let validUntil: string | null = null;
  if (isPromotion && validUntilRaw) {
    const end = new Date(`${validUntilRaw}T23:59:59`);
    if (Number.isNaN(end.getTime())) throw new Error("Data de promoção inválida");
    validUntil = end.toISOString();
  }

  return { unitPrice, supermarketId, isPromotion, validUntil };
}

export async function createCatalogProduct(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();
  const { name, brand, unit, packageSize, categoryId, imageUrl } = readProductForm(formData);
  const optionalPrice = readOptionalPriceFromForm(formData);

  const inserted = await sql`
    insert into products (name, brand, unit, package_size, barcode, category_id, image_url, is_global, created_by)
    values (
      ${name},
      ${brand},
      ${unit},
      ${packageSize},
      null,
      ${categoryId},
      ${imageUrl},
      true,
      ${userId}
    )
    returning id
  `;

  const productId = inserted[0]?.id as string;
  if (!productId) throw new Error("Falha ao criar produto");

  if (optionalPrice) {
    const profileRows = await sql`
      select city, neighborhood from profiles where id = ${userId} limit 1
    `;
    const city = (profileRows[0]?.city as string | null) ?? null;
    const neighborhood = (profileRows[0]?.neighborhood as string | null) ?? null;

    const { recordPriceObservation } = await import("@/lib/prices/record-observation");
    await recordPriceObservation({
      productId,
      unitPrice: optionalPrice.unitPrice,
      quantity: 1,
      userId,
      supermarketId: optionalPrice.supermarketId,
      city,
      neighborhood,
      source: "manual",
      isPromotion: optionalPrice.isPromotion,
      validUntil: optionalPrice.validUntil,
    });
  }

  revalidatePath("/products");
  revalidatePath("/prices");
  revalidatePath("/");
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
