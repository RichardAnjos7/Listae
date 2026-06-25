"use client";

import {
  deleteSupermarketFromForm,
  updateSupermarketFromForm,
} from "@/lib/actions/supermarkets";
import { Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

type Market = {
  id: string;
  name: string;
  city: string | null;
  chain_name: string | null;
};

type Props = {
  market: Market;
};

export function SupermarketAdminRow({ market }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Editar mercado</p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="p-1 text-slate-400"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form action={updateSupermarketFromForm} className="flex gap-2">
          <input type="hidden" name="supermarket_id" value={market.id} />
          <input
            name="name"
            required
            defaultValue={market.name}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 text-white px-3 text-sm font-medium shrink-0"
          >
            Salvar
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{market.name}</p>
        <p className="text-xs text-slate-500 truncate">
          {market.chain_name ? `${market.chain_name}` : "Sem rede"}
          {market.city ? ` · ${market.city}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-emerald-600"
          aria-label="Editar mercado"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <form action={deleteSupermarketFromForm}>
          <input type="hidden" name="supermarket_id" value={market.id} />
          <button
            type="submit"
            className="p-2 rounded-xl text-slate-400 hover:text-red-600"
            aria-label="Excluir mercado"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </li>
  );
}
