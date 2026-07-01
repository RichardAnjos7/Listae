"use client";

import type { ListItemRowExt } from "@/lib/hooks/useRealtimeList";
import type { ProductBrandVariant } from "@/lib/actions/products";
import { getProductBrandVariants } from "@/lib/actions/products";
import { resolveListItemProduct } from "@/lib/actions/lists";
import { CurrencyInput } from "@/components/list/CurrencyInput";
import { formatBRL, lineTotal } from "@/lib/utils";
import { Barcode, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ItemPatch = {
  quantity?: number;
  unit_price?: number | null;
  checked?: boolean;
};

type Props = {
  open: boolean;
  item: ListItemRowExt | null;
  listId: string;
  supermarketId?: string | null;
  onClose: () => void;
  onResolved: () => void;
  patchItem: (itemId: string, patch: ItemPatch) => void;
  onOpenScanner: () => void;
};

function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return qty.toFixed(3).replace(/\.?0+$/, "");
}

export function ListItemDetailSheet({
  open,
  item,
  listId,
  supermarketId,
  onClose,
  onResolved,
  patchItem,
  onOpenScanner,
}: Props) {
  const [variants, setVariants] = useState<ProductBrandVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  const variantCount = item?.product?.variant_count ?? 0;
  const hasVariants = variantCount > 0;
  const isGeneric = hasVariants && !item?.product?.brand;

  useEffect(() => {
    if (!open || !item) {
      setVariants([]);
      setSelectedBrandId("");
      return;
    }

    setSelectedBrandId(item.product?.brand ? item.product_id : "");

    if (!hasVariants) {
      setVariants([]);
      return;
    }

    setLoadingVariants(true);
    void getProductBrandVariants(item.product_id, supermarketId ?? null)
      .then(setVariants)
      .catch(() => setVariants([]))
      .finally(() => setLoadingVariants(false));
  }, [open, item, hasVariants, supermarketId, item?.product_id, item?.product?.brand]);

  const handleBrandChange = useCallback(
    async (newProductId: string) => {
      if (!item || !newProductId || newProductId === item.product_id) {
        setSelectedBrandId(newProductId);
        return;
      }

      setResolving(true);
      try {
        const variant = variants.find((v) => v.id === newProductId);
        await resolveListItemProduct(item.id, listId, newProductId, supermarketId ?? null);
        if (variant?.last_price != null && item.unit_price == null) {
          patchItem(item.id, { unit_price: variant.last_price });
        }
        setSelectedBrandId(newProductId);
        onResolved();
        onClose();
      } finally {
        setResolving(false);
      }
    },
    [item, listId, supermarketId, variants, patchItem, onResolved, onClose]
  );

  if (!open || !item) return null;

  const qty = Number(item.quantity);
  const unitPrice = item.unit_price != null ? Number(item.unit_price) : null;
  const sub = lineTotal(qty, unitPrice);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 px-3 pt-3 pb-[calc(var(--app-nav-inset)+0.75rem)] sm:p-3">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {item.product?.name ?? "Produto"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isGeneric ? "Escolha a marca no mercado (opcional)" : "Detalhes do item"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 shrink-0" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {hasVariants && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Marca</span>
            <div className="relative">
              <select
                value={selectedBrandId}
                disabled={resolving || loadingVariants}
                onChange={(e) => void handleBrandChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm pr-8"
              >
                <option value="">Qualquer marca</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand}
                    {v.package_size ? ` · ${v.package_size}` : ""}
                    {v.last_price != null ? ` · ~${formatBRL(v.last_price)}` : ""}
                  </option>
                ))}
              </select>
              {(loadingVariants || resolving) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>
            {variants.length === 0 && !loadingVariants && (
              <p className="text-[10px] text-slate-400">Nenhuma marca cadastrada ainda.</p>
            )}
          </label>
        )}

        {!hasVariants && item.product?.brand && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Marca: <span className="font-medium">{item.product.brand}</span>
          </p>
        )}

        <div className="flex items-center gap-2">
          <label className="flex-1 space-y-1">
            <span className="text-xs text-slate-500">Quantidade ({item.product?.unit ?? "un"})</span>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => patchItem(item.id, { quantity: Math.max(0.001, qty - 1) })}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Diminuir"
              >
                −
              </button>
              <span className="flex-1 text-center text-sm font-medium tabular-nums">{formatQty(qty)}</span>
              <button
                type="button"
                onClick={() => patchItem(item.id, { quantity: qty + 1 })}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Aumentar"
              >
                +
              </button>
            </div>
          </label>
          <label className="flex-1 space-y-1">
            <span className="text-xs text-slate-500">Preço unitário</span>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <span className="text-slate-500 text-sm">R$</span>
              <CurrencyInput
                value={unitPrice}
                onChange={(price) => patchItem(item.id, { unit_price: price })}
                placeholder="0,00"
                aria-label="Preço unitário"
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatBRL(sub)}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenScanner();
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium"
        >
          <Barcode className="h-4 w-4" />
          Escanear código de barras
        </button>
      </div>
    </div>
  );
}
