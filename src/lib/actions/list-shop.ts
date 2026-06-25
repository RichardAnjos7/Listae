"use server";

import { requireUserId } from "@/lib/auth/session";
import { requireListAccess } from "@/lib/db/access";
import { getSql } from "@/lib/db";
import type { CatalogProduct } from "@/lib/actions/products";
import type { Category } from "@/types";

export type ShopSuggestion = CatalogProduct & {
  last_price?: number | null;
  source: "favorite" | "recent";
};

export async function getShoppingCategories(): Promise<Category[]> {
  await requireUserId();
  const sql = getSql();
  const rows = await sql`
    select id, name, icon, display_order
    from categories
    order by display_order, name
  `;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    icon: r.icon as string | null,
    display_order: Number(r.display_order),
  }));
}

export async function getListShopSuggestions(listId: string): Promise<ShopSuggestion[]> {
  const userId = await requireUserId();
  await requireListAccess(listId, userId);
  const sql = getSql();

  const favorites = await sql`
    select
      p.id, p.name, p.brand, p.unit, p.package_size, p.barcode, p.category_id, p.subcategory, p.image_url, p.is_global,
      (
        select ph.price from price_history ph
        where ph.product_id = p.id
        order by ph.recorded_at desc
        limit 1
      ) as last_price
    from favorite_products fp
    join products p on p.id = fp.product_id
    where fp.user_id = ${userId}
    order by fp.created_at desc
    limit 12
  `;

  const recent = await sql`
    select * from public.get_most_bought_products(${userId}::uuid, ${12})
  `;

  const seen = new Set<string>();
  const out: ShopSuggestion[] = [];

  for (const r of favorites) {
    const id = r.id as string;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: r.name as string,
      brand: r.brand as string | null,
      unit: r.unit as string,
      package_size: r.package_size as string | null,
      barcode: r.barcode as string | null,
      category_id: r.category_id as string | null,
      subcategory: r.subcategory as string | null,
      image_url: r.image_url as string | null,
      is_global: Boolean(r.is_global),
      last_price: r.last_price != null ? Number(r.last_price) : null,
      source: "favorite",
    });
  }

  for (const r of recent) {
    const id = r.product_id as string;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: r.product_name as string,
      brand: (r.brand as string) || null,
      unit: r.unit as string,
      package_size: null,
      barcode: null,
      category_id: null,
      subcategory: null,
      image_url: null,
      is_global: true,
      last_price: r.last_price != null ? Number(r.last_price) : null,
      source: "recent",
    });
  }

  return out.slice(0, 20);
}
