"use client";

import type { CityLiveFeedItem } from "@/lib/prices/community-insights";
import { labelFromRecordedAt } from "@/lib/prices/freshness";
import { formatBRL } from "@/lib/utils";
import { Activity, X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  city: string | null;
  items: CityLiveFeedItem[];
  onClose: () => void;
};

function productLabel(name: string, brand: string | null) {
  return brand ? `${name} · ${brand}` : name;
}

export function LiveFeedModal({ open, city, items, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 px-3 pt-3 pb-[calc(var(--app-nav-inset)+0.75rem)] sm:p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Feed completo ao vivo na cidade"
    >
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2 min-w-0">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="truncate">Ao vivo{city ? ` · ${city}` : ""}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          <ul className="space-y-1.5 text-sm">
            {items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <span className="min-w-0 truncate text-slate-800 dark:text-slate-200">
                  <span className="text-[10px] text-slate-400 mr-1">
                    {labelFromRecordedAt(item.recorded_at)}
                  </span>
                  {productLabel(item.product_name, item.brand)} — {item.store_name}
                </span>
                <span className="text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatBRL(item.unit_price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
