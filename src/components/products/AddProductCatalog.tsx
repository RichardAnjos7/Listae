"use client";

import { CatalogProductForm } from "@/components/products/CatalogProductForm";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  icon?: string | null;
};

type MarketOption = {
  id: string;
  name: string;
  city: string | null;
  chain_name: string | null;
};

type Props = {
  categories: CategoryOption[];
  markets?: MarketOption[];
  action: (formData: FormData) => void | Promise<void>;
  autoOpen?: boolean;
};

export function AddProductCatalog({ categories, markets = [], action, autoOpen }: Props) {
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
        Adicionar
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 px-3 pt-3 pb-[calc(var(--app-nav-inset)+0.75rem)] sm:p-3">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Adicionar produto ao catálogo
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <CatalogProductForm
              categories={categories}
              markets={markets}
              action={action}
              submitLabel="Publicar no catálogo"
              enableSuggestions
            />
          </div>
        </div>
      )}
    </>
  );
}
