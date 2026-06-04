"use client";

import {
  addListItem,
  completeList,
  ensureShareCode,
  removeListItem,
  searchProducts,
  updateListItem,
} from "@/lib/actions/lists";
import { useRealtimeList } from "@/lib/hooks/useRealtimeList";
import type { ListItemRow, Product } from "@/types";
import { formatBRL, lineTotal } from "@/lib/utils";
import { Check, Plus, QrCode, Share2, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type Row = ListItemRow & {
  product?: Product | null;
  added_by_profile?: { id: string; name: string } | null;
};

type ListMeta = {
  id: string;
  name: string;
  status: string;
  share_code: string | null;
  supermarket_id?: string | null;
  supermarket?: { name: string } | null;
};

export function ListDetailClient({ list, initialItems }: { list: ListMeta; initialItems: Row[] }) {
  const router = useRouter();
  const { items, total } = useRealtimeList(list.id, initialItems);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Product[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const searchProductsHandler = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setHits([]);
      return;
    }
    const data = await searchProducts(q);
    setHits(data as Product[]);
  }, []);

  const openShare = async () => {
    setBusy(true);
    try {
      const code = await ensureShareCode(list.id);
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/lists/join/${code}`;
      setShareUrl(url);
      setShareOpen(true);
      if (navigator.share) {
        await navigator.share({ title: list.name, text: "Lista compartilhada no iList", url });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    if (shareUrl) void navigator.clipboard.writeText(shareUrl);
  };

  const handleAdd = async (productId: string) => {
    setBusy(true);
    try {
      await addListItem(list.id, productId, 1, null);
      setAdding(false);
      setQuery("");
      setHits([]);
    } finally {
      setBusy(false);
    }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ca = a.product?.category_id ?? "";
      const cb = b.product?.category_id ?? "";
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.product?.name ?? "").localeCompare(b.product?.name ?? "");
    });
  }, [items]);

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{list.name}</h1>
        {list.supermarket?.name && (
          <p className="text-sm text-slate-500">{list.supermarket.name}</p>
        )}
        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-2">
          Total {formatBRL(total)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-medium px-3 py-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
        <button
          type="button"
          onClick={openShare}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium px-3 py-2"
        >
          <Share2 className="h-4 w-4" />
          Compartilhar
        </button>
        {list.status === "active" && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!confirm("Concluir compra e gravar preços no histórico?")) return;
              setBusy(true);
              try {
                await completeList(list.id);
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 text-sm font-medium px-3 py-2"
          >
            <Check className="h-4 w-4" />
            Concluir
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 bg-white dark:bg-slate-900">
          <input
            placeholder="Buscar produto…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              void searchProductsHandler(e.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
          />
          <ul className="max-h-48 overflow-auto text-sm space-y-1">
            {hits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleAdd(p.id)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {p.name}
                  {p.brand && <span className="text-slate-400 text-xs ml-1">· {p.brand}</span>}
                  <span className="text-slate-400 text-xs ml-1">({p.unit})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {shareOpen && shareUrl && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <QrCode className="h-4 w-4" />
            Compartilhar lista
          </div>
          <div className="flex justify-center bg-white p-2 rounded-xl">
            <QRCodeSVG value={shareUrl} size={160} level="M" />
          </div>
          <p className="text-xs text-slate-500 break-all">{shareUrl}</p>
          <button
            type="button"
            onClick={copyLink}
            className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2 text-sm font-medium"
          >
            Copiar link
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {sorted.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
          >
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
                onClick={() => removeListItem(item.id, list.id)}
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
                    if (!Number.isNaN(q) && q > 0)
                      void updateListItem(item.id, list.id, { quantity: q });
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
                    void updateListItem(item.id, list.id, {
                      unit_price: v != null && !Number.isNaN(v) ? v : null,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800"
                />
              </label>
              <div className="col-span-1 flex flex-col justify-end">
                <span className="text-[10px] text-slate-500">Subtotal</span>
                <span className="font-semibold">
                  {formatBRL(
                    lineTotal(
                      Number(item.quantity),
                      item.unit_price != null ? Number(item.unit_price) : null
                    )
                  )}
                </span>
              </div>
            </div>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  void updateListItem(item.id, list.id, { checked: e.target.checked })
                }
              />
              No carrinho
            </label>
          </li>
        ))}
      </ul>

      {sorted.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">Lista vazia. Adicione produtos da base.</p>
      )}
    </div>
  );
}
