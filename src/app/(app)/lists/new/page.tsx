import { createList } from "@/lib/actions/lists";
import { getProfile } from "@/lib/actions/profile";
import { createSupermarket } from "@/lib/actions/supermarkets";
import { getSessionUserId } from "@/lib/auth/session";
import { isSuperDev } from "@/lib/auth/super-dev";
import { SupermarketAdminRow } from "@/components/supermarkets/SupermarketAdminRow";
import { getSql } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewListPage({
  searchParams,
}: {
  searchParams: Promise<{ market_updated?: string; market_deleted?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { market_updated, market_deleted } = await searchParams;
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

  async function createAction(formData: FormData) {
    "use server";
    const id = await createList(formData);
    redirect(`/lists/${id}?plan=1`);
  }

  async function addMarketAction(formData: FormData) {
    "use server";
    await createSupermarket(formData);
    redirect("/lists/new");
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <Link href="/lists" className="text-xs text-emerald-600 font-medium">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-2">Nova lista</h1>
      </div>

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

      <form action={createAction} className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div>
          <label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Nome
          </label>
          <input
            id="name"
            name="name"
            placeholder="Ex.: Compras da semana"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="supermarket_id" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Supermercado (opcional)
          </label>
          <select
            id="supermarket_id"
            name="supermarket_id"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {markets.map((m) => (
              <option key={m.id as string} value={m.id as string}>
                {m.name as string}
                {m.chain_name ? ` (${m.chain_name as string})` : ""}
                {m.city ? ` · ${m.city as string}` : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm hover:bg-emerald-700"
        >
          Criar lista
        </button>
      </form>

      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Cadastrar supermercado</p>
        <p className="text-xs text-slate-500">
          Vincule à rede para alimentar a base compartilhada de preços.
          {!profile?.city && (
            <>
              {" "}
              <Link href="/profile" className="text-emerald-600 font-medium">
                Defina sua cidade
              </Link>{" "}
              para preencher automaticamente.
            </>
          )}
        </p>
        <form action={addMarketAction} className="space-y-2">
          <input
            name="name"
            required
            placeholder="Nome do mercado (ex.: Nova Era Adrianópolis)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <select
            name="chain_id"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">Rede (opcional)</option>
            {chains.map((c) => (
              <option key={c.id as string} value={c.id as string}>
                {c.name as string}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="city"
              placeholder="Cidade"
              defaultValue={profile?.city ?? ""}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              name="neighborhood"
              placeholder="Bairro"
              defaultValue={profile?.neighborhood ?? ""}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <input
            name="address"
            placeholder="Endereço (opcional)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2 text-sm font-medium"
          >
            Salvar mercado
          </button>
        </form>
      </div>

      {canManage && allMarkets.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Administração de mercados</p>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
            Como super_dev, você pode editar ou excluir nomes de mercados cadastrados.
          </p>
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
