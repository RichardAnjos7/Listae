import { ListRow } from "@/components/lists/ListRow";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ListsPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const rows = await sql`
    select
      sl.id,
      sl.name,
      sl.status,
      sl.updated_at,
      sl.owner_id,
      sm.name as supermarket_name
    from shopping_lists sl
    left join supermarkets sm on sm.id = sl.supermarket_id
    where sl.owner_id = ${userId}
       or exists (
         select 1 from list_collaborators lc
         where lc.list_id = sl.id and lc.user_id = ${userId}
       )
    order by sl.updated_at desc
  `;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Listas</h1>
        <Link
          href="/lists/new"
          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-medium px-3 py-2"
        >
          <Plus className="h-4 w-4" />
          Nova
        </Link>
      </div>

      <ul className="space-y-2">
        {rows.map((l) => (
          <ListRow
            key={l.id as string}
            id={l.id as string}
            name={l.name as string}
            status={l.status as string}
            supermarketName={(l.supermarket_name as string | null) ?? null}
            canDelete={(l.owner_id as string) === userId}
          />
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">
          Nenhuma lista ainda.{" "}
          <Link href="/lists/new" className="text-emerald-600 font-medium">
            Criar primeira lista
          </Link>
        </p>
      )}
    </div>
  );
}
