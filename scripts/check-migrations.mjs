import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(".env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const checks = [
  { file: "001_init.sql", label: "table users", q: "select to_regclass('public.users') as ok" },
  {
    file: "002_google_auth.sql",
    label: "column users.google_id",
    q: "select 1 as ok from information_schema.columns where table_schema='public' and table_name='users' and column_name='google_id' limit 1",
  },
  {
    file: "003_username.sql",
    label: "column users.username",
    q: "select 1 as ok from information_schema.columns where table_schema='public' and table_name='users' and column_name='username' limit 1",
  },
  {
    file: "004_shared_prices.sql",
    label: "table price_observations",
    q: "select to_regclass('public.price_observations') as ok",
  },
  {
    file: "005_catalog_search.sql",
    label: "function search_catalog_products",
    q: "select 1 as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='search_catalog_products' limit 1",
  },
  {
    file: "006_alerts_and_receipt.sql",
    label: "table price_alerts",
    q: "select to_regclass('public.price_alerts') as ok",
  },
  {
    file: "007_list_presence.sql",
    label: "table list_presence",
    q: "select to_regclass('public.list_presence') as ok",
  },
  {
    file: "008_product_catalog_enrichment.sql",
    label: "column products.image_url",
    q: "select 1 as ok from information_schema.columns where table_schema='public' and table_name='products' and column_name='image_url' limit 1",
  },
  {
    file: "009_fix_resolve_store_location_volatility.sql",
    label: "function resolve_store_location_for_supermarket",
    q: "select 1 as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='resolve_store_location_for_supermarket' limit 1",
  },
  {
    file: "010_supermarket_categories.sql",
    label: "category Bazar",
    q: "select 1 as ok from public.categories where name='Bazar' limit 1",
  },
  {
    file: "011_city_price_feed.sql",
    label: "function get_city_price_drops",
    q: "select 1 as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_city_price_drops' limit 1",
  },
  {
    file: "012_community_insights.sql",
    label: "function get_city_community_stats",
    q: "select 1 as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_city_community_stats' limit 1",
  },
  {
    file: "012_dashboard_for_you.sql",
    label: "function get_personal_price_drops",
    q: "select 1 as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_personal_price_drops' limit 1",
  },
  {
    file: "013_repurchase_monthly.sql",
    label: "function get_repurchase_suggestions",
    q: "select 1 as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_repurchase_suggestions' limit 1",
  },
  {
    file: "014_push_subscriptions.sql",
    label: "table push_subscriptions",
    q: "select to_regclass('public.push_subscriptions') as ok",
  },
  {
    file: "015_notifications_engine.sql",
    label: "table notification_preferences",
    q: "select to_regclass('public.notification_preferences') as ok",
  },
  {
    file: "016_notifications_quiet_hours.sql",
    label: "column quiet_hours_enabled",
    q: "select 1 as ok from information_schema.columns where table_schema='public' and table_name='notification_preferences' and column_name='quiet_hours_enabled' limit 1",
  },
  {
    file: "017_notifications_center.sql",
    label: "table notifications",
    q: "select to_regclass('public.notifications') as ok",
  },
  {
    file: "018_product_families.sql",
    label: "column products.base_product_id",
    q: "select 1 as ok from information_schema.columns where table_schema='public' and table_name='products' and column_name='base_product_id' limit 1",
  },
  {
    file: "019_catalog_price_promo.sql",
    label: "column price_observations.is_promotion",
    q: "select 1 as ok from information_schema.columns where table_schema='public' and table_name='price_observations' and column_name='is_promotion' limit 1",
  },
  {
    file: "020_live_feed_promo_until.sql",
    label: "get_city_live_feed returns valid_until",
    q: "select 1 as ok from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_city_live_feed' and pg_get_function_result(p.oid) like '%valid_until%' limit 1",
  },
  {
    file: "021_product_submissions.sql",
    label: "table product_submissions",
    q: "select to_regclass('public.product_submissions') as ok",
  },
  {
    file: "022_catalog_notifications.sql",
    label: "column catalog_moderation",
    q: "select 1 as ok from information_schema.columns where table_schema='public' and table_name='notification_preferences' and column_name='catalog_moderation' limit 1",
  },
];

const applied = [];
const missing = [];

for (const c of checks) {
  const rows = await sql.query(c.q);
  const ok = rows[0]?.ok;
  if (ok) applied.push(c.file);
  else missing.push({ file: c.file, label: c.label });
}

console.log(`=== MIGRATIONS APLICADAS (${applied.length}/${checks.length}) ===`);
for (const f of applied) console.log(`  OK  ${f}`);

if (missing.length) {
  console.log("");
  console.log(`=== MIGRATIONS FALTANDO (${missing.length}) ===`);
  for (const m of missing) console.log(`  FALTA  ${m.file}  (${m.label})`);
  process.exit(1);
} else {
  console.log("");
  console.log("Todas as migrations parecem aplicadas no banco remoto.");
}
