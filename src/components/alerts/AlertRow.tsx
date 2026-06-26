"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { deletePriceAlert, togglePriceAlert, type PriceAlertRow } from "@/lib/actions/alerts";
import { formatBRL } from "@/lib/utils";

export function AlertRow({ alert }: { alert: PriceAlertRow }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOffer = alert.alert_type === "below_price";

  const toggle = () => {
    startTransition(async () => {
      await togglePriceAlert(alert.id, !alert.is_active);
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deletePriceAlert(alert.id);
    });
  };

  return (
    <li className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
            isOffer
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
              : "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
          }`}
        >
          {isOffer ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          <p className="font-medium truncate">{alert.product_name}</p>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
            <span>
              {isOffer ? `Até ${formatBRL(Number(alert.target_price))}` : `Alta ≥ ${alert.threshold_pct}%`}
              {alert.city ? ` · ${alert.city}` : ""}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                alert.is_active
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {alert.is_active ? "Ativo" : "Pausado"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">Excluir?</span>
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className="text-[10px] font-medium text-red-600 px-1.5 py-1 rounded disabled:opacity-60"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[10px] text-slate-500 px-1.5 py-1 rounded"
            >
              Não
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={toggle}
              disabled={isPending}
              className="text-[10px] text-slate-500 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : alert.is_active ? "Pausar" : "Ativar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="p-1 text-slate-400 hover:text-red-600"
              aria-label="Excluir alerta"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
