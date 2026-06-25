import type { RepurchaseSuggestion } from "@/lib/dashboard/for-you";
import { ChevronRight, RotateCw } from "lucide-react";
import Link from "next/link";

type Props = {
  items: RepurchaseSuggestion[];
};

function repurchaseLabel(targetDay: number, daysSince: number) {
  const months = daysSince < 45 ? "~1 mês" : `~${Math.round(daysSince / 30)} meses`;
  return `Costuma comprar dia ${targetDay} · última há ${months}`;
}

export function RepurchaseCard({ items }: Props) {
  if (items.length === 0) return null;

  const top = items.slice(0, 3);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
        <RotateCw className="h-4 w-4 text-emerald-600" />
        Hora de recomprar
      </h2>
      <ul className="space-y-1.5">
        {top.map((item) => {
          const label = [item.product_name, item.brand].filter(Boolean).join(" · ");
          return (
            <li
              key={item.product_id}
              className="flex items-start justify-between gap-2 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm text-slate-900 dark:text-white truncate">{label}</p>
                <p className="text-[10px] text-slate-400">
                  {repurchaseLabel(item.target_day, item.days_since_last)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/lists/new"
        className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-medium py-2.5 hover:bg-emerald-700 transition-colors"
      >
        Criar lista de reposição
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
