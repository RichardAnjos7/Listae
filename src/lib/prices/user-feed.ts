import { getSql } from "@/lib/db";

export type UserPurchaseRow = {
  list_id: string;
  list_name: string;
  supermarket_name: string | null;
  city: string | null;
  list_total: number;
  completed_at: string;
  item_count: number;
};

export type UserPriceRow = {
  product_id: string;
  product_name: string;
  brand: string | null;
  store_name: string;
  city: string | null;
  unit_price: number;
  recorded_at: string;
};

export async function fetchUserRecentPurchases(userId: string, limit = 8): Promise<UserPurchaseRow[]> {
  const sql = getSql();
  const rows = await sql`
    select
      ps.list_id,
      sl.name as list_name,
      ps.supermarket_name,
      ps.city,
      ps.list_total,
      ps.completed_at,
      (
        select count(*)::int
        from purchase_snapshot_items psi
        where psi.snapshot_id = ps.id
      ) as item_count
    from purchase_snapshots ps
    join shopping_lists sl on sl.id = ps.list_id
    where ps.owner_id = ${userId}
    order by ps.completed_at desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    list_id: r.list_id as string,
    list_name: r.list_name as string,
    supermarket_name: r.supermarket_name as string | null,
    city: r.city as string | null,
    list_total: Number(r.list_total ?? 0),
    completed_at: r.completed_at as string,
    item_count: Number(r.item_count ?? 0),
  }));
}

export async function fetchUserContributedPrices(
  userId: string,
  city: string | null,
  limit = 12
): Promise<UserPriceRow[]> {
  const sql = getSql();
  const cityParam = city?.trim() || null;

  const rows = await sql`
    select
      po.product_id,
      p.name as product_name,
      p.brand,
      coalesce(sl.name, sm.name, ps.supermarket_name, 'Mercado') as store_name,
      coalesce(po.city, sl.city, sm.city, ps.city) as city,
      po.unit_price,
      po.recorded_at
    from price_observations po
    join products p on p.id = po.product_id
    left join supermarkets sm on sm.id = po.supermarket_id
    left join store_locations sl on sl.id = po.store_location_id
    left join purchase_snapshots ps on ps.list_id = po.list_id
    where po.submitted_by = ${userId}
      and po.status = 'verified'
      and (
        ${cityParam}::text is null
        or trim(${cityParam}::text) = ''
        or lower(coalesce(po.city, sl.city, sm.city, ps.city, '')) = lower(trim(${cityParam}::text))
      )
    order by po.recorded_at desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    product_id: r.product_id as string,
    product_name: r.product_name as string,
    brand: r.brand as string | null,
    store_name: r.store_name as string,
    city: r.city as string | null,
    unit_price: Number(r.unit_price),
    recorded_at: r.recorded_at as string,
  }));
}
