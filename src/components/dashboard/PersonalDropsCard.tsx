import type { PersonalPriceDrop } from "@/lib/dashboard/for-you";
import { formatBRL } from "@/lib/utils";
import { ArrowDownRight, TrendingDown } from "lucide-react";
import Link from "next/link";

type Props = {
  items: PersonalPriceDrop[];
};

export function PersonalDropsCard({ items }: Props) {
  if (items.length === 0) return null;

  const top = items.slice(0, 3);

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2 mb-2">
        <TrendingDown className="h-4 w-4" />
        Baixou pra você
      </h2>
      <p className="text-[11px] text-emerald-800/70 dark:text-emerald-200/70 mb-2">
        Produtos que você compra ficaram mais baratos na cidade
      </p>
      <ul className="space-y-0">
        {top.map((item) => {
          const label = [item.product_name, item.brand].filter(Boolean).join(" · ");
          return (
            <li
              key={`${item.product_id}-${item.store_name}`}
              className="border-b border-emerald-200/50 dark:border-emerald-900/40 last:border-0"
            >
              <Link
                href={`/prices?q=${encodeURIComponent(item.product_name)}`}
                className="flex items-start justify-between gap-3 py-2 -mx-1 px-1 rounded-lg hover:bg-emerald-100/40 dark:hover:bg-emerald-900/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {label}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{item.store_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatBRL(Number(item.current_price))}
                  </p>
                  <p className="text-[10px] text-slate-400 line-through">
                    {formatBRL(Number(item.previous_price))}
                  </p>
                  {item.drop_pct != null && (
                    <p className="text-[10px] font-medium text-emerald-600 flex items-center justify-end gap-0.5">
                      <ArrowDownRight className="h-3 w-3" />
                      {item.drop_pct}%
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
