/**
 * Importa produtos brasileiros do Open Food Facts para o catálogo Neon.
 *
 * Uso:
 *   node scripts/import-openfoodfacts.mjs --dry-run
 *   node scripts/import-openfoodfacts.mjs --apply
 *   node scripts/import-openfoodfacts.mjs --csv caminho/products.csv --dry-run
 *
 * Opções:
 *   --limit N          Máximo de produtos (padrão: 2000)
 *   --dry-run          Gera SQL em neon/import-openfoodfacts.sql
 *   --apply            Insere direto no Neon (requer DATABASE_URL)
 *   --sql-out PATH     Caminho do arquivo SQL (padrão: neon/import-openfoodfacts.sql)
 *   --csv PATH         Processa CSV tabular do OFF em vez da API
 *   --from-sql PATH    Aplica SQL já gerado (sem chamar API)
 *   --country TAG      Filtro de país (padrão: brazil)
 *   --ean-prefix PRE   Ex.: 789 para EAN brasileiro
 *   --no-image         Aceita produtos sem imagem
 *
 * A API do OFF pede User-Agent identificando o app — já configurado abaixo.
 */

import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATEGORY_MAP = JSON.parse(
  readFileSync(join(__dirname, "off-category-map.json"), "utf8")
);

const OFF_SEARCH = "https://world.openfoodfacts.org/api/v2/search";
const OFF_FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "categories_tags",
  "image_url",
  "image_small_url",
  "countries_tags",
].join(",");

const USER_AGENT = "Listaê/1.0 (catalog import; openfoodfacts)";

function parseArgs(argv) {
  const opts = {
    limit: 2000,
    dryRun: false,
    apply: false,
    sqlOut: "neon/import-openfoodfacts.sql",
    csv: null,
    fromSql: null,
    country: "brazil",
    eanPrefix: null,
    requireImage: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--apply") opts.apply = true;
    else if (arg === "--no-image") opts.requireImage = false;
    else if (arg === "--limit") opts.limit = Number(argv[++i]);
    else if (arg === "--sql-out") opts.sqlOut = argv[++i];
    else if (arg === "--csv") opts.csv = argv[++i];
    else if (arg === "--from-sql") opts.fromSql = argv[++i];
    else if (arg === "--country") opts.country = argv[++i];
    else if (arg === "--ean-prefix") opts.eanPrefix = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
      process.exit(0);
    }
  }

  if (!opts.dryRun && !opts.apply) opts.dryRun = true;
  if (opts.apply && opts.dryRun) opts.dryRun = false;

  return opts;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isValidEan(code) {
  if (!/^\d{8,14}$/.test(code)) return false;
  if (code.length !== 13 && code.length !== 8) return false;
  return true;
}

function normalizeBarcode(code) {
  const digits = String(code ?? "").replace(/\D/g, "");
  if (digits.length === 12) return `0${digits}`;
  return digits;
}

function humanizeTag(tag) {
  const key = tag.replace(/^(en|pt|fr):/, "");
  return key
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function resolveCategory(tags) {
  const list = Array.isArray(tags) ? tags : String(tags ?? "").split(",").filter(Boolean);
  let best = null;
  let bestDepth = -1;

  for (const tag of list) {
    const mapped = CATEGORY_MAP.tags[tag.trim()];
    if (!mapped) continue;
    const depth = tag.split(":").length + tag.split("-").length;
    if (depth >= bestDepth) {
      bestDepth = depth;
      best = mapped;
    }
  }

  return best ?? CATEGORY_MAP.defaultCategory;
}

function resolveSubcategory(tags) {
  const list = Array.isArray(tags) ? tags : String(tags ?? "").split(",").filter(Boolean);
  for (let i = list.length - 1; i >= 0; i--) {
    const tag = list[i].trim();
    if (CATEGORY_MAP.subcategoryLabels[tag]) return CATEGORY_MAP.subcategoryLabels[tag];
  }
  const specific = list.filter((t) => !t.endsWith(":groceries") && !t.endsWith(":foods"));
  const last = specific[specific.length - 1];
  return last ? humanizeTag(last) : null;
}

function parseQuantity(raw) {
  const qty = String(raw ?? "").trim();
  if (!qty) return { unit: "un", package_size: null };

  const multi = qty.match(/^(\d+)\s*x\s*([\d.,]+)\s*(ml|mL|l|L|g|kg|un)\b/i);
  if (multi) {
    return { unit: "un", package_size: qty };
  }

  const simple = qty.match(/^([\d.,]+)\s*(kg|g|ml|mL|l|L|un|units?)\b/i);
  if (simple) {
    const value = simple[1];
    const u = simple[2].toLowerCase();
    if (u === "kg") return { unit: "kg", package_size: `${value}kg` };
    if (u === "g") return { unit: "g", package_size: `${value}g` };
    if (u === "l") return { unit: "L", package_size: `${value}L` };
    if (u === "ml") return { unit: "ml", package_size: `${value}ml` };
    return { unit: "un", package_size: qty };
  }

  return { unit: "un", package_size: qty };
}

function normalizeName(productName, brand) {
  let name = String(productName ?? "").trim().replace(/\s+/g, " ");
  if (!name) return null;
  const b = String(brand ?? "").trim();
  if (b && !name.toLowerCase().includes(b.toLowerCase())) {
    name = `${b} ${name}`;
  }
  if (name.length > 120) name = name.slice(0, 117) + "...";
  return name;
}

function pickBrand(brands) {
  const raw = String(brands ?? "").trim();
  if (!raw) return null;
  return raw.split(",")[0].trim() || null;
}

function transformOffProduct(p, opts) {
  const barcode = normalizeBarcode(p.code);
  if (!isValidEan(barcode)) return null;
  if (opts.eanPrefix && !barcode.startsWith(opts.eanPrefix)) return null;

  const brand = pickBrand(p.brands);
  const name = normalizeName(p.product_name, brand);
  if (!name || !brand) return null;

  const imageUrl = p.image_small_url || p.image_url || null;
  if (opts.requireImage && !imageUrl) return null;

  const tags = p.categories_tags ?? [];
  const category = resolveCategory(tags);
  const subcategory = resolveSubcategory(tags);
  const { unit, package_size } = parseQuantity(p.quantity);

  return {
    barcode,
    name,
    brand,
    unit,
    package_size,
    category,
    subcategory,
    image_url: imageUrl,
  };
}

function sqlEscape(value) {
  if (value == null) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function productToInsertSql(p) {
  const categorySubquery = `(select id from public.categories where name = ${sqlEscape(p.category)} limit 1)`;
  return `insert into public.products (name, brand, unit, package_size, barcode, category_id, subcategory, image_url, is_global, created_by)
values (
  ${sqlEscape(p.name)},
  ${sqlEscape(p.brand)},
  ${sqlEscape(p.unit)},
  ${sqlEscape(p.package_size)},
  ${sqlEscape(p.barcode)},
  ${categorySubquery},
  ${sqlEscape(p.subcategory)},
  ${sqlEscape(p.image_url)},
  true,
  null
)
on conflict (barcode) where barcode is not null do update set
  name = excluded.name,
  brand = excluded.brand,
  unit = excluded.unit,
  package_size = excluded.package_size,
  category_id = excluded.category_id,
  subcategory = excluded.subcategory,
  image_url = excluded.image_url,
  is_global = true;`;
}

async function fetchOffPage(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (res.ok) return res.json();

  if ((res.status === 429 || res.status === 503) && attempt <= 5) {
    const wait = 1000 * 2 ** attempt;
    console.warn(`OFF API ${res.status} — nova tentativa em ${wait}ms (${attempt}/5)`);
    await sleep(wait);
    return fetchOffPage(url, attempt + 1);
  }

  throw new Error(`OFF API ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function fetchFromApi(opts) {
  const products = [];
  const seen = new Set();
  let page = 1;
  const pageSize = 100;
  const countryTag = opts.country.toLowerCase().replace(/\s+/g, "-");

  while (products.length < opts.limit) {
    const url = new URL(OFF_SEARCH);
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("page", String(page));
    url.searchParams.set("fields", OFF_FIELDS);
    url.searchParams.set("countries_tags_en", countryTag.charAt(0).toUpperCase() + countryTag.slice(1));

    const data = await fetchOffPage(url);
    const batch = data.products ?? [];
    if (batch.length === 0) break;

    for (const raw of batch) {
      const item = transformOffProduct(raw, opts);
      if (!item || seen.has(item.barcode)) continue;
      seen.add(item.barcode);
      products.push(item);
      if (products.length >= opts.limit) break;
    }

    const pageCount = data.page_count ?? page;
    const count = data.count ?? 0;
    console.log(`Página ${page}/${Math.ceil(count / pageSize) || "?"} — ${products.length} produtos válidos`);

    if (page >= pageCount) break;
    page += 1;
    await sleep(800);
  }

  return products;
}

async function applySqlFile(path) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL é obrigatório para --from-sql");
    process.exit(1);
  }

  const content = readFileSync(path, "utf8");
  const sql = neon(url);
  const statements = content
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(begin|commit)$/i.test(s));

  let n = 0;
  for (const stmt of statements) {
    if (stmt.startsWith("--")) continue;
    await sql.query(stmt);
    n++;
  }
  return n;
}

/** Parser simples para CSV tabular do OFF (campos entre aspas, separador tab). */
function parseTsvLine(line, headers) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "\t" && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current);

  const row = {};
  for (let i = 0; i < headers.length; i++) {
    row[headers[i]] = values[i] ?? "";
  }
  return row;
}

async function fetchFromCsv(opts) {
  const products = [];
  const seen = new Set();
  const countryNeedle = opts.country.toLowerCase();

  const openStream = (path) => {
    if (path.endsWith(".gz")) {
      return createReadStream(path).pipe(createGunzip());
    }
    return createReadStream(path);
  };

  const rl = createInterface({ input: openStream(opts.csv), crlfDelay: Infinity });
  let headers = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headers) {
      headers = line.split("\t").map((h) => h.replace(/^"|"$/g, ""));
      continue;
    }

    const row = parseTsvLine(line, headers);
    const countries = `${row.countries_tags ?? ""} ${row.countries_en ?? ""}`.toLowerCase();
    if (!countries.includes(countryNeedle)) continue;

    const item = transformOffProduct(
      {
        code: row.code,
        product_name: row.product_name,
        brands: row.brands,
        quantity: row.quantity,
        categories_tags: (row.categories_tags ?? "").split(",").filter(Boolean),
        image_url: row.image_url,
        image_small_url: row.image_small_url,
      },
      opts
    );

    if (!item || seen.has(item.barcode)) continue;
    seen.add(item.barcode);
    products.push(item);
    if (products.length >= opts.limit) break;

    if (products.length % 500 === 0) {
      console.log(`${products.length} produtos válidos processados…`);
    }
  }

  return products;
}

async function applyToNeon(products) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL é obrigatório para --apply");
    process.exit(1);
  }

  const sql = neon(url);
  const categories = await sql`select id, name from public.categories`;
  const catByName = new Map(categories.map((c) => [c.name, c.id]));

  let ok = 0;
  for (const p of products) {
    const categoryId = catByName.get(p.category) ?? null;
    await sql`
      insert into public.products (
        name, brand, unit, package_size, barcode, category_id, subcategory, image_url, is_global, created_by
      )
      values (
        ${p.name},
        ${p.brand},
        ${p.unit},
        ${p.package_size},
        ${p.barcode},
        ${categoryId},
        ${p.subcategory},
        ${p.image_url},
        true,
        null
      )
      on conflict (barcode) where barcode is not null do update set
        name = excluded.name,
        brand = excluded.brand,
        unit = excluded.unit,
        package_size = excluded.package_size,
        category_id = excluded.category_id,
        subcategory = excluded.subcategory,
        image_url = excluded.image_url,
        is_global = true
    `;
    ok++;
    if (ok % 100 === 0) console.log(`${ok}/${products.length} inseridos…`);
  }

  return ok;
}

async function main() {
  const opts = parseArgs(process.argv);
  console.log("Import Open Food Facts → Listaê");

  if (opts.fromSql) {
    console.log(`Aplicando SQL: ${opts.fromSql}`);
    const n = await applySqlFile(opts.fromSql);
    console.log(`${n} statements executados.`);
    return;
  }

  console.log(`Modo: ${opts.apply ? "apply (Neon)" : "dry-run (SQL)"}`);
  console.log(`Limite: ${opts.limit} | País: ${opts.country} | Imagem obrigatória: ${opts.requireImage}`);

  const products = opts.csv
    ? await fetchFromCsv(opts)
    : await fetchFromApi(opts);

  console.log(`\n${products.length} produtos prontos para importação.`);

  if (products.length === 0) {
    console.log("Nenhum produto encontrado. Tente --no-image ou --csv com dump completo do OFF.");
    process.exit(0);
  }

  const byCategory = {};
  for (const p of products) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  }
  console.log("Por categoria:", byCategory);

  if (opts.apply) {
    const n = await applyToNeon(products);
    console.log(`\n${n} produtos importados/atualizados no Neon.`);
    return;
  }

  const header = `-- Gerado por scripts/import-openfoodfacts.mjs em ${new Date().toISOString()}
-- Produtos: ${products.length}
-- Fonte: Open Food Facts (ODbL) — imagens CC BY-SA
-- Rode após neon/migrations/008_product_catalog_enrichment.sql

begin;

`;

  const body = products.map(productToInsertSql).join("\n\n");
  const footer = "\n\ncommit;\n";
  writeFileSync(opts.sqlOut, header + body + footer, "utf8");
  console.log(`\nSQL salvo em ${opts.sqlOut}`);
  console.log("Para aplicar: psql $DATABASE_URL -f " + opts.sqlOut);
  console.log("Ou: node scripts/import-openfoodfacts.mjs --apply");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
