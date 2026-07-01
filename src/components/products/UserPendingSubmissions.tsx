import type { CatalogSubmission } from "@/lib/actions/catalog-submissions";

type Props = {
  submissions: CatalogSubmission[];
};

export function UserPendingSubmissions({ submissions }: Props) {
  if (submissions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-4 space-y-2">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        Suas sugestões em análise
      </h2>
      <ul className="space-y-2">
        {submissions.map((sub) => (
          <li
            key={sub.id}
            className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400"
          >
            <span className="truncate">
              {sub.category_icon ? `${sub.category_icon} ` : ""}
              <span className="font-medium text-slate-800 dark:text-slate-200">{sub.name}</span>
              {sub.brand ? ` · ${sub.brand}` : ""}
            </span>
            <span className="shrink-0 text-amber-600 dark:text-amber-400">Pendente</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500">
        O catálogo é atualizado após revisão da equipe.
      </p>
    </section>
  );
}
