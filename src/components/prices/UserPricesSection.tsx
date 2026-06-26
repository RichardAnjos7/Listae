import { labelFromRecordedAt } from "@/lib/prices/freshness";
import type { UserPriceRow, UserPurchaseRow } from "@/lib/prices/user-feed";
import { formatBRL } from "@/lib/utils";
import { ChevronDown, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";

type Props = {
  purchases: UserPurchaseRow[];
  prices: UserPriceRow[];
  city: string | null;
};

function productTitle(row: Pick<UserPriceRow, "product_name" | "brand">) {
  return [row.product_name, row.brand].filter(Boolean).join(" · ");
}

export function UserPricesSection({ purchases, prices, city }: Props) {
  if (purchases.length === 0 && prices.length === 0) return null;

  return (
    <div className="space-y-4">
      {purchases.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
            Suas compras recentes
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Listas concluídas{city ? ` em ${city}` : ""}
          </p>
          <ul className="space-y-2">
            {purchases.map((p) => (
              <li key={p.list_id}>
                <Link
                  href={`/history`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {p.list_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {p.supermarket_name ?? "Sem mercado"}
                      {p.city ? ` · ${p.city}` : ""}
                      {p.item_count > 0 ? ` · ${p.item_count} itens` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatBRL(p.list_total)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {labelFromRecordedAt(p.completed_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {prices.length > 0 && (
        <details className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-emerald-600" />
                Preços que você registrou
                <span className="font-normal text-slate-400">({prices.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Últimos valores enviados ao concluir listas
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="px-4 pb-4">
            {prices.map((row, i) => (
              <li
                key={`${row.product_id}-${row.store_name}-${i}`}
                className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug truncate">
                    {productTitle(row)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{row.store_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatBRL(row.unit_price)}
                  </p>
                  <p className="text-[10px] text-slate-400">{labelFromRecordedAt(row.recorded_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
