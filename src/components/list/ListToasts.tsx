"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { X } from "lucide-react";

export type ListToastVariant = "default" | "success";

export type ListToast = {
  id: string;
  message: string;
  amount?: number;
  variant?: ListToastVariant;
};

export function ListToasts({ toasts, onDismiss }: { toasts: ListToast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ListToast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const id = window.setTimeout(() => onDismiss(toast.id), 4500);
    return () => window.clearTimeout(id);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.variant === "success";

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-xl text-sm px-3 py-2.5 shadow-lg flex items-start gap-2 ${
        isSuccess
          ? "bg-emerald-700 text-white border border-emerald-500/30"
          : "bg-slate-900 text-white"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p>{toast.message}</p>
        {toast.amount != null && toast.amount > 0 && (
          <p className="text-amber-300 font-semibold text-xs mt-0.5">+{formatBRL(toast.amount)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 text-slate-400 hover:text-white shrink-0"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useListToasts() {
  const [toasts, setToasts] = useState<ListToast[]>([]);

  const push = (message: string, amount?: number, variant: ListToastVariant = "default") => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), message, amount, variant }]);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, push, dismiss };
}
