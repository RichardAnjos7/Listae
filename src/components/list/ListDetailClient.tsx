"use client";

import {
  addListItem,
  addListItemsBatch,
  completeList,
  ensureShareCode,
  removeListItem,
  updateListItem,
} from "@/lib/actions/lists";
import { getListShopSuggestions, type ShopSuggestion } from "@/lib/actions/list-shop";
import { findProductByBarcode, searchCatalogProducts, type CatalogProduct } from "@/lib/actions/products";
import {
  BUDGET_ALERT_THRESHOLD,
  useRealtimeList,
  type ListChangeEvent,
  type ListItemRowExt,
} from "@/lib/hooks/useRealtimeList";
import { enqueueListAction, flushListOfflineQueue } from "@/lib/hooks/useListOfflineQueue";
import { useDebouncedItemPatch } from "@/lib/hooks/useDebouncedItemPatch";
import { useListPresence } from "@/lib/hooks/useListPresence";
import { AddProductPanel } from "@/components/list/AddProductPanel";
import { PlanListBanner } from "@/components/list/PlanListBanner";
import { BarcodeScannerModal } from "@/components/list/BarcodeScannerModal";
import { CompleteListDialog } from "@/components/list/CompleteListDialog";
import { ListItemCard } from "@/components/list/ListItemCard";
import { ListStickyTotal } from "@/components/list/ListStickyTotal";
import { ListToasts, useListToasts } from "@/components/list/ListToasts";
import {
  PurchaseCompleteScreen,
  type PurchaseCompleteSummary,
} from "@/components/list/PurchaseCompleteScreen";
import { CompletedListBanner } from "@/components/list/CompletedListBanner";
import type { Category, ListItemRow } from "@/types";
import { Check, ClipboardList, Plus, QrCode, Share2, ShoppingCart } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Row = ListItemRow & {
  product?: ListItemRow["product"] | null;
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

type Props = {
  list: ListMeta;
  initialItems: Row[];
  currentUserId: string;
  categories: Category[];
};

const SHOP_MODE_KEY = "ilist_shop_mode";

export function ListDetailClient({ list, initialItems, currentUserId, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPlanQuery = searchParams.get("plan") === "1";
  const { toasts, push: pushToast, dismiss } = useListToasts();

  const handleRemoteChange = useCallback(
    (event: ListChangeEvent) => {
      const name = event.addedByName ?? "Parceiro(a)";
      const productName = event.item.product?.name ?? "item";
      if (event.lineTotal >= BUDGET_ALERT_THRESHOLD) {
        pushToast(`${name} adicionou ${productName}`, event.lineTotal);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(200);
        }
      } else {
        pushToast(`${name} atualizou ${productName}`, event.lineTotal > 0 ? event.lineTotal : undefined);
      }
    },
    [pushToast]
  );

  const {
    items,
    total,
    uncheckedCount,
    syncStatus,
    lastSyncedAt,
    onlineUsers,
    refresh,
    applyOptimisticAdd,
    applyOptimisticPatch,
    applyOptimisticRemove,
    clearDirtyPatch,
  } = useRealtimeList({
    listId: list.id,
    currentUserId,
    initial: initialItems as ListItemRowExt[],
    onRemoteChange: handleRemoteChange,
  });

  const [listStatus, setListStatus] = useState(list.status);

  useListPresence(list.id, listStatus === "active");

  const [shopMode, setShopMode] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CatalogProduct[]>([]);
  const [suggestions, setSuggestions] = useState<ShopSuggestion[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [listCategoryFilter, setListCategoryFilter] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSummary, setCompleteSummary] = useState<PurchaseCompleteSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setListStatus(list.status);
  }, [list.status]);

  useEffect(() => {
    if (isPlanQuery) {
      setPlanMode(true);
      setAdding(true);
      setShopMode(false);
      return;
    }
    try {
      setShopMode(localStorage.getItem(SHOP_MODE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, [isPlanQuery]);

  useEffect(() => {
    if (planMode || adding) {
      void getListShopSuggestions(list.id).then(setSuggestions).catch(() => setSuggestions([]));
    }
  }, [planMode, adding, list.id]);

  useEffect(() => {
    const handlers = {
      add: async (listId: string, payload: Record<string, unknown>) => {
        await addListItem(
          listId,
          payload.productId as string,
          Number(payload.quantity ?? 1),
          payload.unitPrice as number | null,
          list.supermarket_id
        );
      },
      update: async (listId: string, payload: Record<string, unknown>) => {
        await updateListItem(payload.itemId as string, listId, payload.patch as never);
      },
      remove: async (listId: string, payload: Record<string, unknown>) => {
        await removeListItem(payload.itemId as string, listId);
      },
    };

    const run = () => void flushListOfflineQueue(handlers).then(() => refresh());
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [list.id, list.supermarket_id, refresh]);

  const toggleShopMode = () => {
    setShopMode((v) => {
      const next = !v;
      if (next) {
        setPlanMode(false);
        setAdding(false);
      }
      try {
        localStorage.setItem(SHOP_MODE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const enterPlanMode = () => {
    setPlanMode(true);
    setAdding(true);
    setShopMode(false);
    try {
      localStorage.setItem(SHOP_MODE_KEY, "0");
    } catch {
      /* ignore */
    }
    router.replace(`/lists/${list.id}?plan=1`, { scroll: false });
  };

  const finishPlanning = () => {
    setPlanMode(false);
    setAdding(false);
    setShopMode(true);
    try {
      localStorage.setItem(SHOP_MODE_KEY, "1");
    } catch {
      /* ignore */
    }
    router.replace(`/lists/${list.id}`, { scroll: false });
  };

  const searchProductsHandler = useCallback(
    async (q: string, catId: string | null) => {
      if (q.trim().length < 2) {
        setHits([]);
        return;
      }
      if (/^\d{8,14}$/.test(q.trim())) {
        const byBarcode = await findProductByBarcode(q.trim());
        setHits(byBarcode ? [byBarcode] : []);
        return;
      }
      const data = await searchCatalogProducts(q, catId);
      setHits(data);
    },
    []
  );

  useEffect(() => {
    const panelOpen = planMode || (adding && !shopMode);
    if (!panelOpen) return;
    const t = window.setTimeout(() => void searchProductsHandler(query, categoryFilter), 250);
    return () => window.clearTimeout(t);
  }, [query, categoryFilter, planMode, adding, shopMode, searchProductsHandler]);

  const openShare = async () => {
    setBusy(true);
    try {
      const code = await ensureShareCode(list.id);
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/lists/join/${code}`;
      setShareUrl(url);
      setShareOpen(true);
      if (navigator.share) {
        await navigator.share({ title: list.name, text: "Lista compartilhada no Listaê", url });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    if (shareUrl) void navigator.clipboard.writeText(shareUrl);
  };

  const handleAddProduct = async (p: CatalogProduct | ShopSuggestion) => {
    const product = {
      id: p.id,
      name: p.name,
      brand: p.brand,
      unit: p.unit,
      category_id: p.category_id,
      package_size: p.package_size,
      image_url: p.image_url,
      barcode: p.barcode,
    };
    const suggestedPrice = "last_price" in p && p.last_price != null ? Number(p.last_price) : null;

    applyOptimisticAdd(product, 1, suggestedPrice, suggestedPrice);

    if (!navigator.onLine) {
      enqueueListAction({
        type: "add",
        listId: list.id,
        payload: { productId: p.id, quantity: 1, unitPrice: suggestedPrice },
      });
      setQuery("");
      return;
    }

    setBusy(true);
    try {
      await addListItem(list.id, p.id, 1, suggestedPrice, list.supermarket_id ?? null);
      setQuery("");
      await refresh();
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    setAdding(true);
    setQuery(code);
    const product = await findProductByBarcode(code);
    if (product) {
      await handleAddProduct(product);
    } else {
      pushToast(`EAN ${code} não encontrado no catálogo`);
    }
  };

  const listIdRef = useRef(list.id);
  listIdRef.current = list.id;

  const persistItemPatch = useCallback(
    async (itemId: string, patch: { quantity?: number; unit_price?: number | null; checked?: boolean }) => {
      await updateListItem(itemId, listIdRef.current, patch);
      clearDirtyPatch(itemId);
    },
    [clearDirtyPatch]
  );

  const { schedule: scheduleItemPatch } = useDebouncedItemPatch({
    onPersist: persistItemPatch,
    onPersistError: () => void refresh(),
  });

  const patchItem = useCallback(
    (
      itemId: string,
      patch: { quantity?: number; unit_price?: number | null; checked?: boolean }
    ) => {
      applyOptimisticPatch(itemId, patch);
      if (!navigator.onLine) {
        enqueueListAction({
          type: "update",
          listId: list.id,
          payload: { itemId, patch },
        });
        return;
      }
      scheduleItemPatch(itemId, patch);
    },
    [applyOptimisticPatch, list.id, scheduleItemPatch]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      applyOptimisticRemove(itemId);
      if (!navigator.onLine) {
        enqueueListAction({
          type: "remove",
          listId: list.id,
          payload: { itemId },
        });
        return;
      }
      await removeListItem(itemId, list.id);
      void refresh();
    },
    [applyOptimisticRemove, list.id, refresh]
  );

  const filtered = useMemo(() => {
    let rows = [...items];
    if (mineOnly) {
      rows = rows.filter((i) => i.added_by === currentUserId);
    }
    if (listCategoryFilter) {
      rows = rows.filter((i) => i.product?.category_id === listCategoryFilter);
    }
    return rows.sort((a, b) => {
      const ca = a.product?.category_id ?? "";
      const cb = b.product?.category_id ?? "";
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.product?.name ?? "").localeCompare(b.product?.name ?? "");
    });
  }, [items, mineOnly, listCategoryFilter, currentUserId]);

  const handleAddAllSuggestions = async () => {
    const existingIds = new Set(items.map((i) => i.product_id));
    const toAdd = suggestions.filter((s) => !existingIds.has(s.id));
    if (toAdd.length === 0) {
      pushToast("Todos os sugeridos já estão na lista");
      return;
    }

    for (const p of toAdd) {
      applyOptimisticAdd(
        {
          id: p.id,
          name: p.name,
          brand: p.brand,
          unit: p.unit,
          category_id: p.category_id,
          package_size: p.package_size,
          image_url: p.image_url,
        },
        1,
        p.last_price ?? null,
        p.last_price ?? null
      );
    }

    if (!navigator.onLine) {
      for (const p of toAdd) {
        enqueueListAction({
          type: "add",
          listId: list.id,
          payload: { productId: p.id, quantity: 1, unitPrice: p.last_price ?? null },
        });
      }
      pushToast(`${toAdd.length} itens adicionados (offline)`);
      return;
    }

    setBusy(true);
    try {
      const { added } = await addListItemsBatch(
        list.id,
        toAdd.map((p) => ({
          productId: p.id,
          quantity: 1,
          unitPrice: p.last_price ?? null,
        })),
        list.supermarket_id ?? null
      );
      pushToast(`${added} ${added === 1 ? "item adicionado" : "itens adicionados"}`);
      await refresh();
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const addedProductIds = useMemo(
    () => new Set(items.map((i) => i.product_id)),
    [items]
  );

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const pricedCount = useMemo(
    () => items.filter((i) => i.unit_price != null).length,
    [items]
  );

  const groupedFiltered = useMemo(() => {
    if (shopMode || listCategoryFilter) return null;

    const groupMap = new Map<string, ListItemRowExt[]>();
    for (const item of filtered) {
      const key = item.product?.category_id ?? "__none__";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }

    return Array.from(groupMap.entries()).sort(([a], [b]) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      const orderA = categoryById.get(a)?.display_order ?? 999;
      const orderB = categoryById.get(b)?.display_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (categoryById.get(a)?.name ?? "").localeCompare(categoryById.get(b)?.name ?? "");
    });
  }, [filtered, shopMode, listCategoryFilter, categoryById]);

  const renderItemCard = (item: ListItemRowExt) => {
    const cat = item.product?.category_id
      ? categoryById.get(item.product.category_id)
      : undefined;
    const showCategoryMeta = groupedFiltered == null;
    return (
      <ListItemCard
        key={item.id}
        item={item}
        shopMode={shopMode && isActive}
        readOnly={!isActive}
        categoryIcon={cat?.icon}
        categoryName={showCategoryMeta ? cat?.name : undefined}
        patchItem={patchItem}
        removeItem={removeItem}
      />
    );
  };

  const categoryName = (id: string | null) =>
    id ? categoryById.get(id)?.name ?? null : null;

  const showPlanPanel = planMode || (adding && !shopMode);
  const showAddToggle = !planMode && !shopMode;
  const isActive = listStatus === "active";

  return (
    <div className={`space-y-3 pb-8 ${shopMode ? "pt-0" : "pt-2"}`}>
      <ListToasts toasts={toasts} onDismiss={dismiss} />

      <ListStickyTotal
        listName={list.name}
        supermarketName={list.supermarket?.name}
        total={total}
        uncheckedCount={uncheckedCount}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onlineUsers={onlineUsers}
        shopMode={shopMode}
      />

      {listStatus === "completed" && !completeSummary && (
        <CompletedListBanner listName={list.name} total={total} />
      )}

      {!shopMode && (
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white sr-only">{list.name}</h1>
        </div>
      )}

      {planMode && isActive && (
        <PlanListBanner
          itemCount={items.length}
          pricedCount={pricedCount}
          estimatedTotal={total}
          suggestionCount={suggestions.filter((s) => !addedProductIds.has(s.id)).length}
          busy={busy}
          onAddSuggestions={() => void handleAddAllSuggestions()}
          onGoToShop={finishPlanning}
        />
      )}

      {isActive && (
      <div className="flex flex-wrap gap-2">
        {showAddToggle && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-medium px-3 py-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        )}
        {!planMode && !shopMode && items.length > 0 && (
          <button
            type="button"
            onClick={enterPlanMode}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium px-3 py-2"
          >
            <ClipboardList className="h-4 w-4" />
            Planejar
          </button>
        )}
        {shopMode && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setScannerOpen(false);
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium px-3 py-2"
          >
            <Plus className="h-4 w-4" />
            Item esquecido
          </button>
        )}
        <button
          type="button"
          onClick={toggleShopMode}
          className={`inline-flex items-center gap-1 rounded-xl text-sm font-medium px-3 py-2 ${
            shopMode
              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300"
              : "border border-slate-300 dark:border-slate-600"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          {shopMode ? "Sair do modo compra" : "Modo compra"}
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
        {listStatus === "active" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setCompleteOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 text-sm font-medium px-3 py-2"
          >
            <Check className="h-4 w-4" />
            Concluir
          </button>
        )}
      </div>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <button
          type="button"
          onClick={() => setMineOnly((v) => !v)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            mineOnly
              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600"
          }`}
        >
          Só meus itens
        </button>
        {categories.slice(0, 6).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setListCategoryFilter(listCategoryFilter === c.id ? null : c.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
              listCategoryFilter === c.id
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600"
            }`}
          >
            {c.icon} {c.name}
          </button>
        ))}
        {listCategoryFilter && (
          <span className="text-[10px] text-slate-500">
            Filtro: {categoryName(listCategoryFilter)}
          </span>
        )}
      </div>

      {showPlanPanel && (
        <AddProductPanel
          query={query}
          onQueryChange={setQuery}
          hits={hits}
          suggestions={suggestions}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryFilter={setCategoryFilter}
          onAdd={(p) => void handleAddProduct(p)}
          onOpenScanner={() => setScannerOpen(true)}
          busy={busy}
          addedProductIds={addedProductIds}
          planMode={planMode}
        />
      )}

      {!showPlanPanel && adding && shopMode && (
        <AddProductPanel
          query={query}
          onQueryChange={setQuery}
          hits={hits}
          suggestions={suggestions}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryFilter={setCategoryFilter}
          onAdd={(p) => {
            void handleAddProduct(p);
            setAdding(false);
          }}
          onOpenScanner={() => setScannerOpen(true)}
          busy={busy}
          addedProductIds={addedProductIds}
        />
      )}

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => void handleBarcodeScan(code)}
      />

      {shareOpen && shareUrl && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <QrCode className="h-4 w-4" />
            Compartilhar lista — peça para escanear ou abrir o link
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

      <CompleteListDialog
        open={completeOpen}
        listId={list.id}
        listTotal={total}
        onClose={() => setCompleteOpen(false)}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const pricesSavedCount = items.filter(
            (i) => i.unit_price != null && Number(i.unit_price) > 0
          ).length;
          const summary: PurchaseCompleteSummary = {
            listId: list.id,
            listName: list.name,
            supermarketName: list.supermarket?.name ?? null,
            total,
            itemCount: items.length,
            pricesSavedCount,
          };
          try {
            await completeList(list.id);
            setCompleteOpen(false);
            setListStatus("completed");
            setShopMode(false);
            setPlanMode(false);
            setAdding(false);
            setCompleteSummary(summary);
            pushToast("Compra concluída! Preços salvos no histórico.", undefined, "success");
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      />

      {completeSummary && (
        <PurchaseCompleteScreen
          summary={completeSummary}
          onDismiss={() => {
            setCompleteSummary(null);
            router.refresh();
          }}
        />
      )}

      {groupedFiltered ? (
        <div className="space-y-4">
          {groupedFiltered.map(([catKey, groupItems]) => {
            const cat = catKey === "__none__" ? null : categoryById.get(catKey);
            return (
              <section key={catKey}>
                <h3 className="sticky top-14 z-10 -mx-1 px-1 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-[var(--background)]/95 backdrop-blur-sm flex items-center gap-1">
                  {cat?.icon && <span>{cat.icon}</span>}
                  {cat?.name ?? "Outros"}
                  <span className="text-slate-400 font-normal">({groupItems.length})</span>
                </h3>
                <ul className="space-y-2 mt-1">{groupItems.map(renderItemCard)}</ul>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className={shopMode ? "space-y-2" : "space-y-3"}>
          {filtered.map(renderItemCard)}
        </ul>
      )}

      {filtered.length === 0 && !showPlanPanel && (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-slate-500">
            {items.length === 0
              ? "Monte sua lista antes de ir ao mercado."
              : "Nenhum item neste filtro."}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={enterPlanMode}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-medium px-4 py-2"
            >
              <ClipboardList className="h-4 w-4" />
              Escolher produtos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
