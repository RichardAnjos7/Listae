"use client";

import type { ListItemRowExt } from "@/lib/hooks/useRealtimeList";
import { formatBRL, lineTotal } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";

type Props = {
  item: ListItemRowExt;
  shopMode: boolean;
  onQuantityChange: (qty: number) => void;
  onPriceChange: (price: number | null) => void;
  onCheckedChange: (checked: boolean) => void;
  onRemove: () => void;
};

export function ListItemCard({
  item,
  shopMode,
  onQuantityChange,
  onPriceChange,
  onCheckedChange,
  onRemove,
}: Props) {
  const qty = Number(item.quantity);
  const sub = lineTotal(qty, item.unit_price != null ? Number(item.unit_price) : null);

  if (shopMode) {
    return (
      <li
        className={`rounded-xl border p-2.5 ${
          item.checked
            ? "border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-900/50"
            : "border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900"
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCheckedChange(!item.checked)}
            className={`h-6 w-6 rounded-full border-2 shrink-0 flex items-center justify-center ${
              item.checked ? "bg-emerald-600 border-emerald-600" : "border-slate-300"
            }`}
            aria-label={item.checked ? "Desmarcar" : "Marcar no carrinho"}
          >
            {item.checked && <span className="text-white text-xs">✓</span>}
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate text-slate-900 dark:text-white">
              {item.product?.name ?? "Produto"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {item.added_by_profile?.name && `por ${item.added_by_profile.name}`}
            </p>
          </div>
          <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 shrink-0">
            {formatBRL(sub)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => onQuantityChange(Math.max(0.001, qty - 1))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Diminuir"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-medium min-w-[2rem] text-center tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => onQuantityChange(qty + 1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Aumentar"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <label className="flex-1 flex items-center gap-1 text-xs">
            <span className="text-slate-500 shrink-0">R$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              defaultValue={item.unit_price ?? ""}
              key={`shop-p-${item.id}-${item.unit_price}`}
              onBlur={(e) => {
                const v = e.target.value === "" ? null : parseFloat(e.target.value);
                onPriceChange(v != null && !Number.isNaN(v) ? v : null);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800"
              placeholder="un."
            />
          </label>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-slate-400 hover:text-red-600"
            aria-label="Remover"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900 dark:text-white truncate">
            {item.product?.name ?? "Produto"}
          </p>
          <p className="text-xs text-slate-500">
            {item.product?.brand && `${item.product.brand} · `}
            {item.product?.unit}
            {item.added_by_profile?.name && (
              <span className="ml-1">· por {item.added_by_profile.name}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-slate-400 hover:text-red-600"
          aria-label="Remover"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
        <label className="col-span-1">
          <span className="text-[10px] text-slate-500 block">Qtd</span>
          <input
            type="number"
            min={0.001}
            step="any"
            defaultValue={item.quantity}
            key={`q-${item.id}-${item.quantity}`}
            onBlur={(e) => {
              const q = parseFloat(e.target.value);
              if (!Number.isNaN(q) && q > 0) onQuantityChange(q);
            }}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800"
          />
        </label>
        <label className="col-span-1">
          <span className="text-[10px] text-slate-500 block">R$ un.</span>
          <input
            type="number"
            min={0}
            step="0.01"
            defaultValue={item.unit_price ?? ""}
            key={`p-${item.id}-${item.unit_price}`}
            onBlur={(e) => {
              const v = e.target.value === "" ? null : parseFloat(e.target.value);
              onPriceChange(v != null && !Number.isNaN(v) ? v : null);
            }}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800"
          />
        </label>
        <div className="col-span-1 flex flex-col justify-end">
          <span className="text-[10px] text-slate-500">Subtotal</span>
          <span className="font-semibold">{formatBRL(sub)}</span>
        </div>
      </div>
      <label className="flex items-center gap-2 mt-2 text-sm">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        No carrinho
      </label>
    </li>
  );
}
