"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

type ChainOption = { id: string; name: string };

type Props = {
  chains: ChainOption[];
  defaultCity?: string;
  defaultNeighborhood?: string;
  hasCityInProfile: boolean;
  action: (formData: FormData) => void | Promise<void>;
  autoOpen?: boolean;
};

export function AddSupermarketCatalog({
  chains,
  defaultCity = "",
  defaultNeighborhood = "",
  hasCityInProfile,
  action,
  autoOpen,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium shrink-0 hover:text-emerald-700 dark:hover:text-emerald-300"
      >
        <Plus className="h-4 w-4" />
        Cadastrar
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 px-3 pt-3 pb-[calc(var(--app-nav-inset)+0.75rem)] sm:p-3">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Cadastrar supermercado
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vincule à rede para alimentar a base compartilhada de preços.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!hasCityInProfile && (
              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
                <Link href="/profile" className="font-medium underline">
                  Defina sua cidade no perfil
                </Link>{" "}
                para preencher automaticamente.
              </p>
            )}

            <form action={action} className="space-y-2">
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
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="city"
                  placeholder="Cidade"
                  defaultValue={defaultCity}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                />
                <input
                  name="neighborhood"
                  placeholder="Bairro"
                  defaultValue={defaultNeighborhood}
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
                className="w-full rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 py-2 text-sm font-medium"
              >
                Salvar mercado
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
