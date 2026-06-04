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
          <li key={l.id as string}>
            <Link
              href={`/lists/${l.id}`}
              className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm active:scale-[0.99] transition-transform"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{l.name as string}</p>
                  {l.supermarket_name && (
                    <p className="text-xs text-slate-500">{l.supermarket_name as string}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 h-fit ${
                    l.status === "active"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : l.status === "completed"
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {l.status === "active" ? "Ativa" : l.status === "completed" ? "Concluída" : (l.status as string)}
                </span>
              </div>
            </Link>
          </li>
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
