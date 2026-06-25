import { getSql } from "@/lib/db";

export type RepurchaseSuggestion = {
  product_id: string;
  product_name: string;
  brand: string | null;
  target_day: number;
  days_since_last: number;
  purchase_count: number;
  last_at: string;
};

export type PersonalPriceDrop = {
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

export type DashboardForYou = {
  repurchase: RepurchaseSuggestion[];
  personalDrops: PersonalPriceDrop[];
};

const EMPTY: DashboardForYou = { repurchase: [], personalDrops: [] };

export async function fetchDashboardForYou(
  userId: string,
  city: string | null
): Promise<DashboardForYou> {
  const sql = getSql();
  const cityParam = city?.trim() || null;

  try {
    const [repurchaseRes, dropsRes] = await Promise.all([
      sql`select * from public.get_repurchase_suggestions(${userId}::uuid, ${5})`,
      sql`select * from public.get_personal_price_drops(${userId}::uuid, ${cityParam}, ${5})`,
    ]);

    return {
      repurchase: (repurchaseRes ?? []) as RepurchaseSuggestion[],
      personalDrops: (dropsRes ?? []) as PersonalPriceDrop[],
    };
  } catch {
    return EMPTY;
  }
}
