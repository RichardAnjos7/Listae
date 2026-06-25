"use client";

import { formatBRL } from "@/lib/utils";
import { Check, History, LayoutDashboard, Plus, X } from "lucide-react";
import Link from "next/link";

export type PurchaseCompleteSummary = {
  listId: string;
  listName: string;
  supermarketName: string | null;
  total: number;
  itemCount: number;
  pricesSavedCount: number;
};

type Props = {
  summary: PurchaseCompleteSummary;
  onDismiss: () => void;
};

export function PurchaseCompleteScreen({ summary, onDismiss }: Props) {
  const historyHref = `/history?completed=${summary.listId}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 px-3 pt-3 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.75rem)] sm:p-3">
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 shadow-xl overflow-hidden"
        role="dialog"
        aria-labelledby="purchase-complete-title"
      >
        <div className="bg-emerald-600 px-4 py-5 text-center text-white relative">
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 text-emerald-100 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h2 id="purchase-complete-title" className="text-lg font-semibold">
            Compra concluída!
          </h2>
          <p className="text-sm text-emerald-100 mt-1">{summary.listName}</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total da compra</p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              {formatBRL(summary.total)}
            </p>
            {summary.supermarketName && (
              <p className="text-sm text-slate-500 mt-1">{summary.supermarketName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {summary.itemCount}
              </p>
              <p className="text-xs text-slate-500">itens na lista</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {summary.pricesSavedCount}
              </p>
              <p className="text-xs text-slate-500">preços salvos</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Seus preços foram gravados no histórico e alimentam o dashboard e a base compartilhada
            da cidade.
          </p>

          <div className="space-y-2">
            <Link
              href={historyHref}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <History className="h-4 w-4" />
              Ver no histórico
            </Link>
            <Link
              href="/lists/new"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 py-2.5 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova lista
            </Link>
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Ir ao dashboard
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Continuar vendo esta lista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
