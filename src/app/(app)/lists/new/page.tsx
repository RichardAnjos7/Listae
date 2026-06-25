import { createList } from "@/lib/actions/lists";
import { getProfile } from "@/lib/actions/profile";
import { createSupermarket } from "@/lib/actions/supermarkets";
import { getSessionUserId } from "@/lib/auth/session";
import { isSuperDev } from "@/lib/auth/super-dev";
import { NewListForm } from "@/components/lists/NewListForm";
import { AddSupermarketCatalog } from "@/components/supermarkets/AddSupermarketCatalog";
import { SupermarketAdminRow } from "@/components/supermarkets/SupermarketAdminRow";
import { getSql } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewListPage({
  searchParams,
}: {
  searchParams: Promise<{ market_updated?: string; market_deleted?: string; market_added?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { market_updated, market_deleted, market_added } = await searchParams;
  const canManage = await isSuperDev(userId);

  const sql = getSql();
  const [markets, chains, profile, allMarkets] = await Promise.all([
    sql`
      select sm.id, sm.name, sm.city, rc.name as chain_name
      from supermarkets sm
      left join retail_chains rc on rc.id = sm.chain_id
      where sm.user_id = ${userId}
      order by sm.name
    `,
    sql`select id, name from retail_chains order by name`,
    getProfile(userId),
    canManage
      ? sql`
          select sm.id, sm.name, sm.city, rc.name as chain_name
          from supermarkets sm
          left join retail_chains rc on rc.id = sm.chain_id
          order by sm.name
        `
      : Promise.resolve([]),
  ]);

  const chainOptions = chains.map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  const marketOptions = markets.map((m) => ({
    id: m.id as string,
    name: m.name as string,
    chain_name: m.chain_name as string | null,
    city: m.city as string | null,
  }));

  async function createAction(formData: FormData) {
    "use server";
    const id = await createList(formData);
    redirect(`/lists/${id}?plan=1`);
  }

  async function addMarketAction(formData: FormData) {
    "use server";
    await createSupermarket(formData);
    redirect("/lists/new?market_added=1");
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/lists" className="text-xs text-emerald-600 font-medium">
            ← Voltar
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-2">Nova lista</h1>
        </div>
        <AddSupermarketCatalog
          chains={chainOptions}
          defaultCity={profile?.city ?? ""}
          defaultNeighborhood={profile?.neighborhood ?? ""}
          hasCityInProfile={Boolean(profile?.city)}
          action={addMarketAction}
        />
      </div>

      {market_added === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Mercado cadastrado. Selecione-o na lista abaixo.
        </div>
      )}
      {market_updated === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Nome do mercado atualizado.
        </div>
      )}
      {market_deleted === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Mercado excluído.
        </div>
      )}

      <NewListForm markets={marketOptions} action={createAction} />

      {canManage && allMarkets.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Administração de mercados</p>
          <ul className="space-y-2">
            {allMarkets.map((m) => (
              <SupermarketAdminRow
                key={m.id as string}
                market={{
                  id: m.id as string,
                  name: m.name as string,
                  city: m.city as string | null,
                  chain_name: m.chain_name as string | null,
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
