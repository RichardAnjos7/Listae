"use client";

import { Check, ShoppingCart, Sparkles } from "lucide-react";

type Props = {
  itemCount: number;
  suggestionCount: number;
  busy: boolean;
  onAddSuggestions: () => void;
  onGoToShop: () => void;
};

export function PlanListBanner({
  itemCount,
  suggestionCount,
  busy,
  onAddSuggestions,
  onGoToShop,
}: Props) {
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          Monte sua lista em casa
        </h2>
        <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70 mt-1">
          Escolha os produtos e quantidades antes de ir ao mercado. No corredor, use o modo compra
          para marcar itens e ajustar preços.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestionCount > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={onAddSuggestions}
            className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium px-3 py-2 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Usar favoritos e recentes
            <span className="text-emerald-600/70 text-xs">({suggestionCount})</span>
          </button>
        )}
        {itemCount > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={onGoToShop}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-medium px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            Pronto, vou ao mercado
          </button>
        )}
      </div>

      {itemCount > 0 && (
        <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/60 flex items-center gap-1">
          <Check className="h-3 w-3" />
          {itemCount} {itemCount === 1 ? "item na lista" : "itens na lista"} — ajuste as quantidades abaixo
        </p>
      )}
    </div>
  );

}
