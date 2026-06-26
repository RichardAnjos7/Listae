import { AlertRow } from "@/components/alerts/AlertRow";
import { NewAlertDialog } from "@/components/alerts/NewAlertDialog";
import { CityCommunityLive } from "@/components/prices/CityCommunityLive";
import { CityPriceFeed } from "@/components/prices/CityPriceFeed";
import { UserPricesSection } from "@/components/prices/UserPricesSection";
import { getUserAlerts } from "@/lib/actions/alerts";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { fetchCommunityInsights } from "@/lib/prices/community-insights";
import { fetchCityPriceFeed } from "@/lib/prices/city-feed";
import { fetchUserContributedPrices, fetchUserRecentPurchases } from "@/lib/prices/user-feed";
import { labelFromFreshnessKey, labelFromRecordedAt } from "@/lib/prices/freshness";
import { formatBRL } from "@/lib/utils";
import { Bell, Search } from "lucide-react";
import Link from "next/link";

type SearchRow = {
  product_id: string;
  product_name: string;
  brand: string | null;
  unit: string;
  package_size: string | null;
  store_name: string;
  city: string | null;
  unit_price: number;
  recorded_at: string;
  freshness_label: string;
};

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const isSearching = query.length >= 2;

  const sql = getSql();
  const profileRows = await sql`
    select city from profiles where id = ${userId} limit 1
  `;
  const userCity = (profileRows[0]?.city as string | null) ?? null;

  const rows: SearchRow[] = isSearching
    ? ((await sql`
        select * from public.search_shared_product_prices(
          ${query},
          ${userCity},
          ${40}
        )
      `) as SearchRow[])
    : [];

  const [feed, userPurchases, userPrices, community, alerts] = isSearching
    ? [null, [], [], null, []]
    : await Promise.all([
        fetchCityPriceFeed(userCity),
        fetchUserRecentPurchases(userId),
        fetchUserContributedPrices(userId, userCity),
        fetchCommunityInsights(userCity).catch(() => null),
        getUserAlerts(userId),
      ]);

  const hasUserData = userPurchases.length > 0 || userPrices.length > 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Preços na cidade</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Base compartilhada alimentada ao concluir compras.
          {userCity ? (
            <>
              {" "}
              Filtro: <span className="font-medium text-slate-700 dark:text-slate-300">{userCity}</span>
            </>
          ) : (
            <>
              {" "}
              <Link href="/profile" className="text-emerald-600 font-medium">
                Defina sua cidade no perfil
              </Link>{" "}
              para filtrar por região.
            </>
          )}
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Ex.: arroz, leite, óleo…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2.5 text-sm"
            minLength={2}
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-emerald-600 text-white font-medium px-4 text-sm hover:bg-emerald-700 shrink-0"
        >
          Buscar
        </button>
      </form>

      {query.length > 0 && query.length < 2 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">Digite pelo menos 2 caracteres.</p>
      )}

      {/* 1. Na sua cidade */}
      {!isSearching && feed && (
        <CityPriceFeed
          city={userCity}
          stats={feed.stats}
          drops={feed.drops}
          lowest={feed.lowest}
          recent={feed.recent}
          sections={["stats"]}
        />
      )}

      {/* 2. Ao vivo na cidade */}
      {!isSearching && community && (
        <CityCommunityLive city={userCity} initialData={community} sections={["live"]} />
      )}

      {/* 3. Meus alertas de preço */}
      {!isSearching && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Meus alertas de preço
            </h2>
            <NewAlertDialog defaultCity={userCity ?? ""} />
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nenhum alerta. Toque em{" "}
              <span className="font-medium text-emerald-600">+ Novo alerta</span> ou no sino ao lado
              de um preço na busca.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {alerts.map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 4. Cesta básica por mercado */}
      {!isSearching && community && (
        <CityCommunityLive city={userCity} initialData={community} sections={["basket"]} />
      )}

      {/* 5. Menor preço agora + Atualizações da comunidade */}
      {!isSearching && feed && (
        <CityPriceFeed
          city={userCity}
          stats={feed.stats}
          drops={feed.drops}
          lowest={feed.lowest}
          recent={feed.recent}
          sections={["lowest", "recent"]}
        />
      )}

      {/* Demais seções */}
      {!isSearching && feed && (
        <CityPriceFeed
          city={userCity}
          stats={feed.stats}
          drops={feed.drops}
          lowest={feed.lowest}
          recent={feed.recent}
          sections={["drops"]}
        />
      )}

      {!isSearching && hasUserData && (
        <UserPricesSection purchases={userPurchases} prices={userPrices} city={userCity} />
      )}

      {!isSearching && community && (
        <CityCommunityLive
          city={userCity}
          initialData={community}
          sections={["header", "heat", "alerts", "comparable", "trend"]}
        />
      )}

      {isSearching && rows.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">
          Nenhum preço verificado para &quot;{query}&quot;
          {userCity ? ` em ${userCity}` : ""}. Conclua listas com preços para alimentar a base.
        </p>
      )}

      {isSearching && rows.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {rows.length} resultado{rows.length !== 1 ? "s" : ""} para &quot;{query}&quot;
            {userCity ? ` em ${userCity}` : ""}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs text-slate-500">
                  <th className="p-3 font-medium">Produto</th>
                  <th className="p-3 font-medium">Mercado</th>
                  <th className="p-3 font-medium text-right">Preço</th>
                  <th className="p-3 font-medium text-right sr-only">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const title = [r.product_name, r.brand, r.package_size].filter(Boolean).join(" · ");
                  const fresh =
                    labelFromRecordedAt(r.recorded_at) || labelFromFreshnessKey(r.freshness_label);
                  const stale = r.freshness_label === "antigo";
                  return (
                    <tr
                      key={`${r.product_id}-${r.store_name}-${i}`}
                      className="border-b border-slate-50 dark:border-slate-800/80 last:border-0"
                    >
                      <td className="p-3 align-top">
                        <p className="font-medium text-slate-900 dark:text-white leading-snug">{title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{r.unit}</p>
                      </td>
                      <td className="p-3 align-top text-slate-700 dark:text-slate-300">
                        <p>{r.store_name}</p>
                        {r.city && <p className="text-[10px] text-slate-400">{r.city}</p>}
                      </td>
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatBRL(Number(r.unit_price))}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${stale ? "text-amber-600" : "text-slate-400"}`}
                        >
                          {fresh}
                        </p>
                      </td>
                      <td className="p-3 align-top text-right">
                        <NewAlertDialog
                          variant="icon"
                          defaultCity={userCity ?? ""}
                          presetProduct={{ id: r.product_id, name: r.product_name }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Link
            href="/prices"
            className="block text-center text-xs text-emerald-600 font-medium py-1"
          >
            ← Ver feed da cidade
          </Link>
        </>
      )}

      <p className="text-xs text-slate-500 text-center">
        Preços suspeitos não entram na busca.{" "}
        <Link href="/receipt" className="text-emerald-600 font-medium">
          Importar nota (OCR)
        </Link>
      </p>
    </div>
  );
}
