"use client";

import type { CatalogSubmission } from "@/lib/actions/catalog-submissions";
import { Check, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";

type Props = {
  submissions: CatalogSubmission[];
  approveAction: (formData: FormData) => void | Promise<void>;
  rejectAction: (formData: FormData) => void | Promise<void>;
};

function formatPackage(sub: CatalogSubmission): string {
  if (sub.package_size) return sub.package_size;
  return sub.unit;
}

function stagingImageUrl(path: string | null): string | null {
  if (!path) return null;
  return `/api/catalog/product-image?p=${encodeURIComponent(path)}`;
}

export function CatalogSubmissionQueue({ submissions, approveAction, rejectAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  if (submissions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Aguardando aprovação
        </h2>
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
          {submissions.length}
        </span>
      </div>
      <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70">
        Ao aprovar, a foto vai para o storage e o produto entra no catálogo global.
      </p>

      <ul className="space-y-3">
        {submissions.map((sub) => {
          const img = stagingImageUrl(sub.image_staging_path);
          return (
            <li
              key={sub.id}
              className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-white dark:bg-slate-900 p-3 space-y-2"
            >
              <div className="flex gap-3">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="h-14 w-14 rounded-lg object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    {sub.category_icon ?? "📦"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {sub.name}
                  </p>
                  {sub.brand && (
                    <p className="text-xs text-slate-500 truncate">{sub.brand}</p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sub.category_name ?? "Sem categoria"} · {formatPackage(sub)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    por @{sub.submitter_username ?? "usuário"} ·{" "}
                    {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {sub.unit_price != null && (
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      Preço sugerido: R$ {sub.unit_price.toFixed(2).replace(".", ",")}
                      {sub.supermarket_name ? ` · ${sub.supermarket_name}` : ""}
                      {sub.is_promotion && sub.valid_until
                        ? ` · Promo até ${new Date(sub.valid_until).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={approveAction}>
                  <input type="hidden" name="submission_id" value={sub.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Aprovar
                  </button>
                </form>

                {rejectingId === sub.id ? (
                  <form action={rejectAction} className="flex flex-1 min-w-[200px] gap-1.5">
                    <input type="hidden" name="submission_id" value={sub.id} />
                    <input
                      name="reject_reason"
                      placeholder="Motivo (opcional)"
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-lg border border-red-300 text-red-600 px-2 py-1.5 text-xs font-medium"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(null)}
                      className="text-xs text-slate-500 px-1"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setRejectingId(sub.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900 text-red-600 px-3 py-1.5 text-xs font-medium"
                  >
                    <X className="h-3.5 w-3.5" />
                    Rejeitar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
