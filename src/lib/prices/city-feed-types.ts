export type CityCommunityStats = {
  today_count: number;
  week_count: number;
  month_count: number;
  distinct_products: number;
  distinct_users_week?: number;
};

export type CityPriceDrop = {
  product_id: string;
  product_name: string;
  brand: string | null;
  store_name: string;
  city: string | null;
  previous_price: number;
  current_price: number;
  drop_pct: number | null;
  recorded_at: string;
};

export type CityPriceRow = {
  product_id: string;
  product_name: string;
  brand: string | null;
  unit?: string;
  package_size?: string | null;
  store_name: string;
  city: string | null;
  unit_price: number;
  recorded_at: string;
  freshness_label: string;
};

export const EMPTY_CITY_STATS: CityCommunityStats = {
  today_count: 0,
  week_count: 0,
  month_count: 0,
  distinct_products: 0,
  distinct_users_week: 0,
};
