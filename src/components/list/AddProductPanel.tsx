"use client";

import type { ShopSuggestion } from "@/lib/actions/list-shop";
import type { CatalogProduct } from "@/lib/actions/products";
import type { Category } from "@/types";
import { formatBRL } from "@/lib/utils";
import { Barcode, Check, Star } from "lucide-react";

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  hits: CatalogProduct[];
  suggestions: ShopSuggestion[];
  categories: Category[];
  categoryFilter: string | null;
  onCategoryFilter: (id: string | null) => void;
  onAdd: (product: CatalogProduct | ShopSuggestion) => void;
  onOpenScanner: () => void;
  busy: boolean;
  addedProductIds?: ReadonlySet<string>;
  planMode?: boolean;
};

export function AddProductPanel({
  query,
  onQueryChange,
  hits,
  suggestions,
  categories,
  categoryFilter,
  onCategoryFilter,
  onAdd,
  onOpenScanner,
  busy,
  addedProductIds,
  planMode = false,
}: Props) {
  const showSuggestions = query.trim().length < 2;
  const list = showSuggestions ? suggestions : hits;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 bg-white dark:bg-slate-900">
      <div className="flex gap-2">
        <input
          placeholder="Buscar ou EAN…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onOpenScanner}
          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-600 dark:text-slate-300"
          aria-label="Escanear código"
        >
          <Barcode className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onCategoryFilter(null)}
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            categoryFilter == null
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategoryFilter(categoryFilter === c.id ? null : c.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
              categoryFilter === c.id
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {c.icon && `${c.icon} `}
            {c.name}
          </button>
        ))}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <p className="text-[10px] text-slate-500 flex items-center gap-1">
          <Star className="h-3 w-3" />
          Favoritos e comprados antes
        </p>
      )}
      {!showSuggestions && query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-xs text-slate-400">Digite ao menos 2 caracteres ou o EAN.</p>
      )}

      <ul className={`${planMode ? "max-h-64" : "max-h-52"} overflow-auto text-sm space-y-1`}>
        {list.map((p) => {
          const inList = addedProductIds?.has(p.id) ?? false;
          return (
          <li key={p.id}>
            <button
              type="button"
              disabled={busy || inList}
              onClick={() => onAdd(p)}
              className={`w-full text-left px-2 py-1.5 rounded-lg disabled:opacity-50 flex items-start gap-2 ${
                inList
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {inList && <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />}
              <span className="min-w-0 flex-1">
                {p.name}
                {p.brand && <span className="text-slate-400 text-xs ml-1">· {p.brand}</span>}
                {"package_size" in p && p.package_size && (
                  <span className="text-slate-400 text-xs ml-1">· {String(p.package_size)}</span>
                )}
                <span className="text-slate-400 text-xs ml-1">({p.unit})</span>
                {"last_price" in p && p.last_price != null && (
                  <span className="text-emerald-600 text-xs ml-1">~{formatBRL(Number(p.last_price))}</span>
                )}
                {inList && planMode && (
                  <span className="text-emerald-600 text-xs ml-1">· na lista</span>
                )}
              </span>
            </button>
          </li>
        );
        })}
        {!showSuggestions && query.trim().length >= 2 && hits.length === 0 && (
          <li className="text-xs text-slate-400 px-2 py-2">Nenhum produto encontrado.</li>
        )}
      </ul>
    </div>
  );
}
