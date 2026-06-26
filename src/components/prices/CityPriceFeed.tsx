import { labelFromFreshnessKey, labelFromRecordedAt } from "@/lib/prices/freshness";
import type { CityCommunityStats, CityPriceDrop, CityPriceRow } from "@/lib/prices/city-feed-types";
import { formatBRL } from "@/lib/utils";
import { ArrowDownRight, ChevronDown, MapPin, TrendingDown, Users } from "lucide-react";
import Link from "next/link";

export type FeedSection = "stats" | "drops" | "lowest" | "recent";

type Props = {
  city: string | null;
  stats: CityCommunityStats;
  drops: CityPriceDrop[];
  lowest: CityPriceRow[];
  recent: CityPriceRow[];
  /** Quando informado, renderiza apenas estas seções (na ordem do JSX). */
  sections?: FeedSection[];
};

function productTitle(row: { product_name: string; brand: string | null; package_size?: string | null }) {
  return [row.product_name, row.brand, row.package_size ?? null].filter(Boolean).join(" · ");
}

function Freshness({ recordedAt, freshnessLabel }: { recordedAt: string; freshnessLabel: string }) {
  const label = labelFromRecordedAt(recordedAt) || labelFromFreshnessKey(freshnessLabel);
  const stale = freshnessLabel === "antigo";
  return (
    <p className={`text-[10px] mt-0.5 ${stale ? "text-amber-600" : "text-slate-400"}`}>{label}</p>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {title}
            {count != null && (
              <span className="ml-1 font-normal text-slate-400">({count})</span>
            )}
          </h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function PriceRowItem({ row }: { row: CityPriceRow }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug truncate">
          {productTitle(row)}
        </p>
        <p className="text-xs text-slate-500 truncate">{row.store_name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
          {formatBRL(Number(row.unit_price))}
        </p>
        <Freshness recordedAt={row.recorded_at} freshnessLabel={row.freshness_label} />
      </div>
    </li>
  );
}

export function CityPriceFeed({ city, stats, drops, lowest, recent, sections }: Props) {
  const show = (key: FeedSection) => !sections || sections.includes(key);
  const hasAnyData = stats.month_count > 0;

  const blocks = {
    stats: show("stats"),
    drops: show("drops") && drops.length > 0,
    lowest: show("lowest") && lowest.length > 0,
    recent: show("recent") && recent.length > 0,
  };

  if (!hasAnyData) {
    if (!show("stats")) return null;
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 text-center space-y-2">
        <MapPin className="h-8 w-8 text-slate-400 mx-auto" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {city ? `Ainda não há preços em ${city}` : "Nenhum preço na base ainda"}
        </p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Conclua listas com preços ou importe notas fiscais para alimentar a base compartilhada.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Link
            href="/lists"
            className="rounded-xl bg-emerald-600 text-white text-xs font-medium px-3 py-2"
          >
            Minhas listas
          </Link>
          <Link
            href="/receipt"
            className="rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-medium px-3 py-2"
          >
            Escanear nota
          </Link>
        </div>
      </section>
    );
  }

  if (!blocks.stats && !blocks.drops && !blocks.lowest && !blocks.recent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {blocks.stats && (
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-emerald-600" />
          Na sua cidade
          {city && (
            <span className="text-xs font-normal text-slate-500">· {city}</span>
          )}
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 px-2 py-2.5">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.today_count}</p>
            <p className="text-slate-500">hoje</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 px-2 py-2.5">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.week_count}</p>
            <p className="text-slate-500">esta semana</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 px-2 py-2.5">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {stats.distinct_products}
            </p>
            <p className="text-slate-500">produtos</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-2.5 text-center">
          {stats.month_count} preços registrados pelos usuários nos últimos 30 dias
        </p>
      </section>
      )}

      {blocks.drops && (
        <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4" />
            Baixou na cidade
          </h2>
          <ul className="space-y-0">
            {drops.map((d) => (
              <li
                key={`${d.product_id}-${d.store_name}`}
                className="flex items-start justify-between gap-3 py-2.5 border-b border-emerald-200/60 dark:border-emerald-900/40 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {productTitle(d)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{d.store_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatBRL(Number(d.current_price))}
                  </p>
                  <p className="text-[10px] text-slate-400 line-through">
                    {formatBRL(Number(d.previous_price))}
                  </p>
                  {d.drop_pct != null && (
                    <p className="text-[10px] font-medium text-emerald-600 flex items-center justify-end gap-0.5">
                      <ArrowDownRight className="h-3 w-3" />
                      {d.drop_pct}%
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blocks.lowest && (
        <CollapsibleSection
          title="Menor preço agora"
          subtitle="Melhor preço verificado por produto nos últimos 30 dias"
          count={lowest.length}
        >
          <ul>
            {lowest.map((row) => (
              <PriceRowItem key={`${row.product_id}-low`} row={row} />
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {blocks.recent && (
        <CollapsibleSection title="Atualizações da comunidade" count={recent.length}>
          <ul>
            {recent.map((row, i) => (
              <PriceRowItem key={`${row.product_id}-${row.store_name}-${i}`} row={row} />
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
