import { ListDetailClient } from "@/components/list/ListDetailClient";
import { getSessionUserId } from "@/lib/auth/session";
import { userCanAccessList } from "@/lib/db/access";
import { getSql } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function ListDetailPage({ params }: PageProps) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { id } = await params;
  if (!(await userCanAccessList(id, userId))) notFound();

  const sql = getSql();
  const listRows = await sql`
    select
      sl.id,
      sl.name,
      sl.status,
      sl.share_code,
      sl.supermarket_id,
      sm.name as supermarket_name
    from shopping_lists sl
    left join supermarkets sm on sm.id = sl.supermarket_id
    where sl.id = ${id}
    limit 1
  `;
  const list = listRows[0];
  if (!list) notFound();

  const rawItems = await sql`
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
    where li.list_id = ${id}
    order by li.created_at asc
  `;

  return (
    <div>
      <Link href="/lists" className="text-xs text-emerald-600 font-medium">
        ← Listas
      </Link>
      <ListDetailClient
        list={{
          id: list.id as string,
          name: list.name as string,
          status: list.status as string,
          share_code: list.share_code as string | null,
          supermarket_id: list.supermarket_id as string | null,
          supermarket: list.supermarket_name ? { name: list.supermarket_name as string } : null,
        }}
        initialItems={(rawItems as never[]) ?? []}
      />
    </div>
  );
}
