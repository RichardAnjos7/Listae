"use client";

import { getListOnlineCollaborators } from "@/lib/actions/lists";
import { formatBRL } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  listId: string;
  listTotal: number;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
};

export function CompleteListDialog({ open, listId, listTotal, onClose, onConfirm, busy }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [othersOnline, setOthersOnline] = useState<{ name: string }[]>([]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setConfirmText("");
      return;
    }
    void getListOnlineCollaborators(listId).then(setOthersOnline).catch(() => setOthersOnline([]));
  }, [open, listId]);

  if (!open) return null;

  const canConfirmStep2 = confirmText.trim().toUpperCase() === "CONCLUIR";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Concluir compra</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Total estimado: <strong>{formatBRL(listTotal)}</strong>. Os preços serão gravados no histórico.
            </p>
            {othersOnline.length > 0 && (
              <div className="flex gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-900 dark:text-amber-100">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>
                  <strong>{othersOnline.map((o) => o.name).join(", ")}</strong> ainda está na lista.
                  Confirme que todos terminaram de comprar.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-medium"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Digite <strong>CONCLUIR</strong> para encerrar a lista e salvar no histórico.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CONCLUIR"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm uppercase"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!canConfirmStep2 || busy}
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {busy ? "Salvando…" : "Concluir compra"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
