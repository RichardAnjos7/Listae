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
      coalesce(ps.supermarket_name, sm.name) as supermarket_name,
      ps.city,
      coalesce(ps.list_total, 0) as snapshot_total,
      (select count(*)::int from purchase_snapshot_items psi where psi.snapshot_id = ps.id) as item_count
    from shopping_lists sl
    left join supermarkets sm on sm.id = sl.supermarket_id
    left join purchase_snapshots ps on ps.list_id = sl.id
    where sl.owner_id = ${userId}
      and sl.status = 'completed'
    order by sl.completed_at desc
    limit 40
  `;

  const rows = await Promise.all(
    lists.map(async (l) => {
      let total = Number(l.snapshot_total);
      if (total <= 0) {
        const items = await sql`
          select quantity, unit_price from list_items where list_id = ${l.id}
        `;
        total = items.reduce(
          (s, i) => s + Number(i.quantity) * (i.unit_price != null ? Number(i.unit_price) : 0),
          0
        );
      }
      return {
        id: l.id as string,
        name: l.name as string,
        completed_at: l.completed_at as string | null,
        supermarket_name: l.supermarket_name as string | null,
        city: l.city as string | null,
        item_count: Number(l.item_count) || 0,
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

      <Link
        href="/receipt"
        className="block text-center rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 font-medium py-2.5 text-sm"
      >
        Escanear nota fiscal (OCR)
      </Link>

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
                    {(l.item_count > 0 || l.city) && (
                      <p className="text-xs text-slate-400">
                        {l.item_count > 0 ? `${l.item_count} itens` : ""}
                        {l.item_count > 0 && l.city ? " · " : ""}
                        {l.city ?? ""}
                      </p>
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
