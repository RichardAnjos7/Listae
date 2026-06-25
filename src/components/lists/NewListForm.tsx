"use client";

import { useRef, useState } from "react";

type MarketOption = {
  id: string;
  name: string;
  chain_name: string | null;
  city: string | null;
};

type Props = {
  markets: MarketOption[];
  action: (formData: FormData) => void | Promise<void>;
};

export function NewListForm({ markets, action }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  return (
    <form
      action={async (formData) => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);
        try {
          await action(formData);
        } catch {
          submittedRef.current = false;
          setSubmitting(false);
        }
      }}
      className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
    >
      <div>
        <label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Nome
        </label>
        <input
          id="name"
          name="name"
          placeholder="Ex.: Compras da semana"
          disabled={submitting}
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="supermarket_id" className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Supermercado (opcional)
        </label>
        <select
          id="supermarket_id"
          name="supermarket_id"
          disabled={submitting}
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="">—</option>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.chain_name ? ` (${m.chain_name})` : ""}
              {m.city ? ` · ${m.city}` : ""}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? "Criando…" : "Criar lista"}
      </button>
    </form>
  );
}
