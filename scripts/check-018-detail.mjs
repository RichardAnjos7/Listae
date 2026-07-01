import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(".env.local", "utf8");
const line = env.split("\n").find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const rows = await sql`
  select
    (select count(*)::int from information_schema.columns
     where table_schema='public' and table_name='products' and column_name='base_product_id') as has_col,
    (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='get_product_brand_variants') as has_variants_fn,
    (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='compare_list_basket_prices') as has_basket_fn,
    (select count(*)::int from products where brand is null and is_global = true
       and exists (select 1 from products v where v.base_product_id = products.id)) as generic_parents,
    (select count(*)::int from products where base_product_id is not null) as linked_variants
`;
console.log(rows[0]);
