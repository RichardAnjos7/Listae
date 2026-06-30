import { getSql } from "@/lib/db";

export type ListItemApiRow = {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | null;
  checked: boolean;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  last_price: number | null;
  product?: {
    id: string;
    name: string;
    brand: string | null;
    unit: string;
    category_id: string | null;
    package_size: string | null;
    image_url: string | null;
    variant_count?: number;
  } | null;
  added_by_profile?: { id: string; name: string } | null;
};

export async function fetchListItems(listId: string): Promise<ListItemApiRow[]> {
  const sql = getSql();
  const items = await sql`
    select
      li.*,
      coalesce(store_ph.price, any_ph.price) as last_price,
      json_build_object(
        'id', p.id,
        'name', p.name,
        'brand', p.brand,
        'unit', p.unit,
        'category_id', p.category_id,
        'package_size', p.package_size,
        'image_url', p.image_url,
        'variant_count', (
          select count(*)::int from products v where v.base_product_id = p.id
        )
      ) as product,
      case
        when pr.id is null then null
        else json_build_object('id', pr.id, 'name', pr.name)
      end as added_by_profile
    from list_items li
    join products p on p.id = li.product_id
    join shopping_lists sl on sl.id = li.list_id
    left join profiles pr on pr.id = li.added_by
    left join lateral (
      select ph.price
      from price_history ph
      where ph.product_id = li.product_id
        and sl.supermarket_id is not null
        and ph.supermarket_id = sl.supermarket_id
      order by ph.recorded_at desc
      limit 1
    ) store_ph on true
    left join lateral (
      select ph.price
      from price_history ph
      where ph.product_id = li.product_id
      order by ph.recorded_at desc
      limit 1
    ) any_ph on true
    where li.list_id = ${listId}
    order by li.created_at asc
  `;
  return (items as ListItemApiRow[]).map((row) => ({
    ...row,
    last_price: row.last_price != null ? Number(row.last_price) : null,
  }));
}

export async function fetchListItemsVersion(listId: string): Promise<string> {
  const sql = getSql();
  const rows = await sql`
    select coalesce(max(updated_at)::text, '') as version
    from list_items
    where list_id = ${listId}
  `;
  return (rows[0]?.version as string) ?? "";
}

export async function fetchSingleListItem(itemId: string): Promise<ListItemApiRow | null> {
  const sql = getSql();
  const rows = await sql`
    select
      li.*,
      coalesce(store_ph.price, any_ph.price) as last_price,
      json_build_object(
        'id', p.id,
        'name', p.name,
        'brand', p.brand,
        'unit', p.unit,
        'category_id', p.category_id,
        'package_size', p.package_size,
        'image_url', p.image_url,
        'variant_count', (
          select count(*)::int from products v where v.base_product_id = p.id
        )
      ) as product,
      case
        when pr.id is null then null
        else json_build_object('id', pr.id, 'name', pr.name)
      end as added_by_profile
    from list_items li
    join products p on p.id = li.product_id
    join shopping_lists sl on sl.id = li.list_id
    left join profiles pr on pr.id = li.added_by
    left join lateral (
      select ph.price
      from price_history ph
      where ph.product_id = li.product_id
        and sl.supermarket_id is not null
        and ph.supermarket_id = sl.supermarket_id
      order by ph.recorded_at desc
      limit 1
    ) store_ph on true
    left join lateral (
      select ph.price
      from price_history ph
      where ph.product_id = li.product_id
      order by ph.recorded_at desc
      limit 1
    ) any_ph on true
    where li.id = ${itemId}
    limit 1
  `;
  const row = rows[0] as ListItemApiRow | undefined;
  if (!row) return null;
  return {
    ...row,
    last_price: row.last_price != null ? Number(row.last_price) : null,
  };
}
