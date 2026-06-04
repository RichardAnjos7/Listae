import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id: listId } = await context.params;
  const sql = getSql();

  const access = await sql`
    select public.user_can_access_list(${listId}::uuid, ${userId}::uuid) as ok
  `;
  if (!access[0]?.ok) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

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

  return NextResponse.json({ items });
}
