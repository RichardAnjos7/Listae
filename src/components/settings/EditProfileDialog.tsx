"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, User, X } from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";

type Props = {
  open: boolean;
  onClose: () => void;
  initial: {
    name: string;
    city: string | null;
    neighborhood: string | null;
  };
};

export function EditProfileDialog({ open, onClose, initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }
    const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateProfile(formData);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="edit-profile-title"
            className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"
          >
            <User className="h-5 w-5 text-emerald-600" />
            Editar perfil
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cidade e bairro filtram preços compartilhados e comparação de cesta.
        </p>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Nome
            </label>
            <input
              ref={firstFieldRef}
              id="name"
              name="name"
              required
              defaultValue={initial.name}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="city" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Cidade
            </label>
            <input
              id="city"
              name="city"
              placeholder="Ex.: Manaus"
              defaultValue={initial.city ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="neighborhood"
              className="text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Bairro (opcional)
            </label>
            <input
              id="neighborhood"
              name="neighborhood"
              placeholder="Ex.: Adrianópolis"
              defaultValue={initial.neighborhood ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
