import { getSql } from "@/lib/db";

import {

  EMPTY_CITY_STATS,

  type CityCommunityStats,

  type CityPriceDrop,

  type CityPriceRow,

} from "@/lib/prices/city-feed-types";



function parseStats(raw: unknown): CityCommunityStats {

  if (!raw || typeof raw !== "object") return EMPTY_CITY_STATS;

  const s = raw as Record<string, unknown>;

  return {

    today_count: Number(s.today_count) || 0,

    week_count: Number(s.week_count) || 0,

    month_count: Number(s.month_count) || 0,

    distinct_products: Number(s.distinct_products) || 0,
    distinct_users_week: Number(s.distinct_users_week) || 0,
  };

}



async function fetchCityFeedFallback(city: string | null) {

  const sql = getSql();

  const cityParam = city?.trim() || null;



  const statsRows = await sql`

    select

      count(*) filter (where po.recorded_at >= date_trunc('day', timezone('utc', now())))::int as today_count,

      count(*) filter (where po.recorded_at >= now() - interval '7 days')::int as week_count,

      count(*) filter (where po.recorded_at >= now() - interval '30 days')::int as month_count,

      count(distinct po.product_id) filter (where po.recorded_at >= now() - interval '30 days')::int as distinct_products

    from public.price_observations po

    left join public.store_locations sl on sl.id = po.store_location_id

    left join public.supermarkets sm on sm.id = po.supermarket_id

    where po.status = 'verified'

      and (

        ${cityParam}::text is null

        or trim(${cityParam}::text) = ''

        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(${cityParam}::text))

      )

  `;



  const recentRes = await sql`

    select

      po.product_id,

      p.name as product_name,

      p.brand,

      coalesce(sl.name, sm.name, 'Mercado') as store_name,

      coalesce(po.city, sl.city, sm.city) as city,

      po.unit_price,

      po.recorded_at,

      case

        when po.recorded_at >= now() - interval '1 hour' then 'agora'

        when po.recorded_at >= now() - interval '24 hours' then 'hoje'

        when po.recorded_at >= now() - interval '48 hours' then 'ontem'

        when po.recorded_at >= now() - interval '7 days' then 'esta semana'

        else 'antigo'

      end as freshness_label

    from public.price_observations po

    join public.products p on p.id = po.product_id

    left join public.store_locations sl on sl.id = po.store_location_id

    left join public.supermarkets sm on sm.id = po.supermarket_id

    where po.status = 'verified'

      and (

        ${cityParam}::text is null

        or trim(${cityParam}::text) = ''

        or lower(coalesce(po.city, sl.city, sm.city, '')) = lower(trim(${cityParam}::text))

      )

    order by po.recorded_at desc

    limit 8

  `;



  const s = statsRows[0] ?? {};

  return {

    stats: {

      today_count: Number(s.today_count) || 0,

      week_count: Number(s.week_count) || 0,

      month_count: Number(s.month_count) || 0,

      distinct_products: Number(s.distinct_products) || 0,

    },

    drops: [] as CityPriceDrop[],

    lowest: [] as CityPriceRow[],

    recent: (recentRes ?? []) as CityPriceRow[],

  };

}



export async function fetchCityPriceFeed(city: string | null) {

  const sql = getSql();

  const cityParam = city?.trim() || null;



  try {

    const [statsRes, dropsRes, lowestRes, recentRes] = await Promise.all([

      sql`select public.get_city_community_stats(${cityParam}) as stats`,

      sql`select * from public.get_city_price_drops(${cityParam}, ${8})`,

      sql`select * from public.get_city_lowest_prices(${cityParam}, ${10})`,

      sql`select * from public.get_city_recent_prices(${cityParam}, ${8})`,

    ]);



    return {

      stats: parseStats(statsRes[0]?.stats),

      drops: (dropsRes ?? []) as CityPriceDrop[],

      lowest: (lowestRes ?? []) as CityPriceRow[],

      recent: (recentRes ?? []) as CityPriceRow[],

    };

  } catch {

    return fetchCityFeedFallback(cityParam);

  }

}


