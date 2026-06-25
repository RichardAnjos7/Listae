"use client";

import type { ListItemRowExt } from "@/lib/hooks/useRealtimeList";
import { formatBRL, lineTotal } from "@/lib/utils";
import { CurrencyInput } from "@/components/list/CurrencyInput";
import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

type ItemPatch = {
  quantity?: number;
  unit_price?: number | null;
  checked?: boolean;
};

type Props = {
  item: ListItemRowExt;
  shopMode: boolean;
  readOnly?: boolean;
  categoryIcon?: string | null;
  categoryName?: string | null;
  patchItem: (itemId: string, patch: ItemPatch) => void;
  removeItem: (itemId: string) => void;
};

function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return qty.toFixed(3).replace(/\.?0+$/, "");
}

function ProductThumb({
  imageUrl,
  categoryIcon,
  name,
}: {
  imageUrl: string | null | undefined;
  categoryIcon: string | null | undefined;
  name: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="h-11 w-11 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 shrink-0"
      />
    );
  }

  return (
    <div
      className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-lg"
      aria-hidden
    >
      {categoryIcon ?? <Package className="h-5 w-5 text-slate-400" />}
    </div>
  );
}

function QuantityStepper({
  qty,
  onQuantityChange,
}: {
  qty: number;
  onQuantityChange: (qty: number) => void;
}) {
  const [displayQty, setDisplayQty] = useState(qty);

  useEffect(() => {
    setDisplayQty(qty);
  }, [qty]);

  const adjust = (delta: number) => {
    const next = Math.max(0.001, displayQty + delta);
    setDisplayQty(next);
    onQuantityChange(next);
  };

  return (
    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => adjust(-1)}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Diminuir"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="px-2 text-sm font-medium min-w-[2rem] text-center tabular-nums">
        {formatQty(displayQty)}
      </span>
      <button
        type="button"
        onClick={() => adjust(1)}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Aumentar"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export const ListItemCard = memo(function ListItemCard({
  item,
  shopMode,
  readOnly = false,
  categoryIcon,
  categoryName,
  patchItem,
  removeItem,
}: Props) {
  const onQuantityChange = useCallback(
    (qty: number) => patchItem(item.id, { quantity: qty }),
    [patchItem, item.id]
  );
  const onPriceChange = useCallback(
    (price: number | null) => patchItem(item.id, { unit_price: price }),
    [patchItem, item.id]
  );
  const onCheckedChange = useCallback(
    (checked: boolean) => patchItem(item.id, { checked }),
    [patchItem, item.id]
  );
  const onRemove = useCallback(() => removeItem(item.id), [removeItem, item.id]);

  const qty = Number(item.quantity);
  const unitPrice = item.unit_price != null ? Number(item.unit_price) : null;
  const lastPrice = item.last_price != null ? Number(item.last_price) : null;
  const sub = lineTotal(qty, unitPrice);
  const hasPrice = unitPrice != null;
  const showLastPriceHint = !hasPrice && lastPrice != null;

  if (readOnly) {
    const metaParts: string[] = [];
    if (item.product?.brand) metaParts.push(item.product.brand);
    metaParts.push(`${formatQty(qty)} ${item.product?.unit ?? "un"}`);

    return (
      <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm opacity-90">
        <div className="flex items-center gap-2.5">
          <ProductThumb
            imageUrl={item.product?.image_url}
            categoryIcon={categoryIcon}
            name={item.product?.name ?? "Produto"}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
              {item.product?.name ?? "Produto"}
            </p>
            <p className="text-xs text-slate-500 truncate">{metaParts.join(" · ")}</p>
          </div>
          <div className="shrink-0 text-right">
            {hasPrice && (
              <p className="text-[10px] text-slate-500">{formatBRL(unitPrice!)} un.</p>
            )}
            <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
              {formatBRL(sub)}
            </p>
          </div>
        </div>
      </li>
    );
  }

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
          <QuantityStepper qty={qty} onQuantityChange={onQuantityChange} />
          <label className="flex-1 flex items-center gap-1 text-xs min-w-0">
            <span className="text-slate-500 shrink-0">R$</span>
            <CurrencyInput
              value={unitPrice}
              onChange={onPriceChange}
              placeholder="0,00"
              aria-label="Preço unitário"
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

  const metaParts: string[] = [];
  if (item.product?.brand) metaParts.push(item.product.brand);
  if (item.product?.package_size) metaParts.push(item.product.package_size);
  metaParts.push(item.product?.unit ?? "un");

  return (
    <li
      className={`rounded-2xl border bg-white dark:bg-slate-900 p-3 shadow-sm ${
        hasPrice
          ? "border-slate-200 dark:border-slate-800"
          : "border-dashed border-slate-300 dark:border-slate-700"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <ProductThumb
          imageUrl={item.product?.image_url}
          categoryIcon={categoryIcon}
          name={item.product?.name ?? "Produto"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 dark:text-white truncate leading-snug">
                {item.product?.name ?? "Produto"}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {metaParts.join(" · ")}
                {categoryName && (
                  <span className="ml-1">
                    · {categoryIcon} {categoryName}
                  </span>
                )}
              </p>
              {item.added_by_profile?.name && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  por {item.added_by_profile.name}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-slate-400 hover:text-red-600 shrink-0"
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-end gap-2 mt-2.5">
            <QuantityStepper qty={qty} onQuantityChange={onQuantityChange} />
            <label className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-500 block mb-0.5">R$ un.</span>
              <CurrencyInput
                value={unitPrice}
                onChange={onPriceChange}
                placeholder={
                  lastPrice != null
                    ? lastPrice.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0,00"
                }
                aria-label="Preço unitário"
              />
            </label>
            <div className="shrink-0 text-right">
              <span className="text-[10px] text-slate-500 block">Subtotal</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatBRL(sub)}
              </span>
            </div>
          </div>

          {showLastPriceHint && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-500">
                Último: {formatBRL(lastPrice!)}
              </span>
              <button
                type="button"
                onClick={() => onPriceChange(lastPrice!)}
                className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Usar
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
});
