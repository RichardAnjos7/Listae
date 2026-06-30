import { ListDetailClient } from "@/components/list/ListDetailClient";
import { getShoppingCategories } from "@/lib/actions/list-shop";
import { getSessionUserId } from "@/lib/auth/session";
import { userCanAccessList } from "@/lib/db/access";
import { getSql } from "@/lib/db";
import { fetchListItems } from "@/lib/list/queries";
import { formatBRL } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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

  const rawItems = await fetchListItems(id);

  const profileRows = await sql`select city from profiles where id = ${userId} limit 1`;
  const userCity = (profileRows[0]?.city as string | null) ?? null;

  let basketCompare: Array<{
    store_name: string;
    estimated_total: number;
    items_priced: number;
    items_total: number;
  }> = [];

  if (list.status === "active" && rawItems.length > 0) {
    basketCompare = (await sql`
      select * from public.compare_list_basket_prices(${id}::uuid, ${userCity})
    `) as typeof basketCompare;
  }

  const categories = await getShoppingCategories();

  return (
    <div>
      <Link href="/lists" className="text-xs text-emerald-600 font-medium">
        ← Listas
      </Link>

      {basketCompare.length > 0 && (
        <section className="mt-3 mb-2 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-3">
          <h2 className="text-xs font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
            Comparar cesta (base compartilhada)
          </h2>
          <ul className="space-y-1.5 text-sm">
            {basketCompare.map((b) => (
              <li key={b.store_name} className="flex justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {b.store_name}
                </span>
                <span className="text-right shrink-0">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatBRL(Number(b.estimated_total))}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {b.items_priced}/{b.items_total} itens
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-slate-500 mt-2">
            Estimativa com preços verificados dos últimos 30 dias. Itens sem marca usam o
            menor preço entre as marcas cadastradas.
          </p>
        </section>
      )}

      <Suspense fallback={<p className="text-sm text-slate-500 mt-4">Carregando lista…</p>}>
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
          currentUserId={userId}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}
