import { createList } from "@/lib/actions/lists";
import { createSupermarket } from "@/lib/actions/supermarkets";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewListPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const markets = await sql`
    select id, name from supermarkets where user_id = ${userId} order by name
  `;

  async function createAction(formData: FormData) {
    "use server";
    const id = await createList(formData);
    redirect(`/lists/${id}`);
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
        <form action={addMarketAction} className="space-y-2">
          <input
            name="name"
            required
            placeholder="Nome do mercado"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
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
    </div>
  );
}
