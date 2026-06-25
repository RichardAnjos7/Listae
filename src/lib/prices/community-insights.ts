import { getSql } from "@/lib/db";

export type CityLiveFeedItem = {
  id: string;
  product_id: string;
  product_name: string;
  brand: string | null;
  store_name: string;
  unit_price: number;
  recorded_at: string;
};

export type CityHeatMapItem = CityLiveFeedItem;

export type BasketRankingRow = {
  store_key: string;
  store_name: string;
  basket_total: number;
  items_found: number;
  items_expected: number;
};

export type CommunityAlertRow = {
  product_id: string;
  product_name: string;
  store_name: string;
  drop_count: number;
  avg_drop_pct: number;
  current_price: number;
};

export type ComparableBasketRow = {
  store_key: string;
  store_name: string;
  basket_total: number;
  items_matched: number;
};

export type ProductTrendDay = {
  day: string;
  avg_price: number;
  obs_count: number;
};

export type CommunityInsights = {
  stats: {
    today_count: number;
    week_count: number;
    month_count: number;
    distinct_products: number;
    distinct_users_week: number;
  };
  liveFeed: CityLiveFeedItem[];
  heatMap: CityHeatMapItem[];
  basketRanking: BasketRankingRow[];
  alerts: CommunityAlertRow[];
  comparableBasket: ComparableBasketRow[];
  trend7d: ProductTrendDay[];
  activeShoppers: number;
};

function cityParam(city: string | null) {
  return city?.trim() || null;
}

export function normalizeSinceParam(since?: string | null): string | null {
  if (!since?.trim()) return null;
  const d = new Date(since);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function fetchCommunityInsights(
  city: string | null,
  since?: string | null
): Promise<CommunityInsights> {
  const sql = getSql();
  const c = cityParam(city);
  const sinceTs = normalizeSinceParam(since);

  const [
    statsRes,
    liveRes,
    heatRes,
    basketRes,
    alertsRes,
    comparableRes,
    trendRes,
    shoppersRes,
  ] = await Promise.all([
    sql`select public.get_city_community_stats(${c}) as stats`,
    sql`select * from public.get_city_live_feed(${c}, ${20}, ${sinceTs})`,
    sql`select * from public.get_city_heat_map_today(${c}, ${10})`,
    sql`select * from public.get_city_basket_ranking(${c})`,
    sql`select * from public.get_community_price_alerts(${c}, ${6})`,
    sql`select * from public.get_comparable_basket_stores(${c}, ${8})`,
    sql`select * from public.get_product_trend_7d(${c}, ${"arroz"})`,
    sql`select public.get_active_shoppers_in_city(${c}) as c`,
  ]);

  const rawStats = (statsRes[0]?.stats ?? {}) as Record<string, unknown>;

  return {
    stats: {
      today_count: Number(rawStats.today_count) || 0,
      week_count: Number(rawStats.week_count) || 0,
      month_count: Number(rawStats.month_count) || 0,
      distinct_products: Number(rawStats.distinct_products) || 0,
      distinct_users_week: Number(rawStats.distinct_users_week) || 0,
    },
    liveFeed: (liveRes ?? []).map((r) => ({
      id: r.id as string,
      product_id: r.product_id as string,
      product_name: r.product_name as string,
      brand: r.brand as string | null,
      store_name: r.store_name as string,
      unit_price: Number(r.unit_price),
      recorded_at: r.recorded_at as string,
    })),
    heatMap: (heatRes ?? []).map((r) => ({
      id: "",
      product_id: r.product_id as string,
      product_name: r.product_name as string,
      brand: r.brand as string | null,
      store_name: r.store_name as string,
      unit_price: Number(r.unit_price),
      recorded_at: r.recorded_at as string,
    })),
    basketRanking: (basketRes ?? []).map((r) => ({
      store_key: r.store_key as string,
      store_name: r.store_name as string,
      basket_total: Number(r.basket_total),
      items_found: Number(r.items_found),
      items_expected: Number(r.items_expected),
    })),
    alerts: (alertsRes ?? []).map((r) => ({
      product_id: r.product_id as string,
      product_name: r.product_name as string,
      store_name: r.store_name as string,
      drop_count: Number(r.drop_count),
      avg_drop_pct: Number(r.avg_drop_pct),
      current_price: Number(r.current_price),
    })),
    comparableBasket: (comparableRes ?? []).map((r) => ({
      store_key: r.store_key as string,
      store_name: r.store_name as string,
      basket_total: Number(r.basket_total),
      items_matched: Number(r.items_matched),
    })),
    trend7d: (trendRes ?? []).map((r) => ({
      day: String(r.day),
      avg_price: Number(r.avg_price),
      obs_count: Number(r.obs_count),
    })),
    activeShoppers: Number(shoppersRes[0]?.c) || 0,
  };
}
