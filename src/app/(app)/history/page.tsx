import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { formatBRL } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default async function HistoryPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const lists = await sql`
    select
      sl.id,
      sl.name,
      sl.completed_at,
      sm.name as supermarket_name
    from shopping_lists sl
    left join supermarkets sm on sm.id = sl.supermarket_id
    where sl.owner_id = ${userId}
      and sl.status = 'completed'
    order by sl.completed_at desc
    limit 40
  `;

  const rows = await Promise.all(
    lists.map(async (l) => {
      const items = await sql`
        select quantity, unit_price from list_items where list_id = ${l.id}
      `;
      const total = items.reduce(
        (s, i) => s + Number(i.quantity) * (i.unit_price != null ? Number(i.unit_price) : 0),
        0
      );
      return {
        id: l.id as string,
        name: l.name as string,
        completed_at: l.completed_at as string | null,
        supermarket_name: l.supermarket_name as string | null,
        total,
      };
    })
  );

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Histórico</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Compras concluídas e totais registrados.
      </p>

      <ul className="space-y-2">
        {rows.map((l) => {
          const when = l.completed_at
            ? format(new Date(l.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
            : "—";
          return (
            <li key={l.id}>
              <Link
                href={`/lists/${l.id}`}
                className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{l.name}</p>
                    <p className="text-xs text-slate-500">{when}</p>
                    {l.supermarket_name && (
                      <p className="text-xs text-slate-400">{l.supermarket_name}</p>
                    )}
                  </div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                    {formatBRL(l.total)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">
          Nenhuma compra concluída. Finalize uma lista na tela da lista.
        </p>
      )}
    </div>
  );
}
