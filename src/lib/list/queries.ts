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
  product?: {
    id: string;
    name: string;
    brand: string | null;
    unit: string;
    category_id: string | null;
  } | null;
  added_by_profile?: { id: string; name: string } | null;
};

export async function fetchListItems(listId: string): Promise<ListItemApiRow[]> {
  const sql = getSql();
  const items = await sql`
    select
      li.*,
      json_build_object(
        'id', p.id,
        'name', p.name,
        'brand', p.brand,
        'unit', p.unit,
        'category_id', p.category_id
      ) as product,
      case
        when pr.id is null then null
        else json_build_object('id', pr.id, 'name', pr.name)
      end as added_by_profile
    from list_items li
    join products p on p.id = li.product_id
    left join profiles pr on pr.id = li.added_by
    where li.list_id = ${listId}
    order by li.created_at asc
  `;
  return items as ListItemApiRow[];
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
      json_build_object(
        'id', p.id,
        'name', p.name,
        'brand', p.brand,
        'unit', p.unit,
        'category_id', p.category_id
      ) as product,
      case
        when pr.id is null then null
        else json_build_object('id', pr.id, 'name', pr.name)
      end as added_by_profile
    from list_items li
    join products p on p.id = li.product_id
    left join profiles pr on pr.id = li.added_by
    where li.id = ${itemId}
    limit 1
  `;
  return (rows[0] as ListItemApiRow) ?? null;
}
