import { createCatalogProduct } from "@/lib/actions/products";
import { getProfile } from "@/lib/actions/profile";
import { toggleFavoriteFromForm } from "@/lib/actions/lists";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { Star } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function productLabel(p: {
  name: string;
  brand: string | null;
  package_size: string | null;
  unit: string;
  barcode: string | null;
}) {
  const parts = [p.name];
  if (p.brand) parts.push(p.brand);
  if (p.package_size) parts.push(p.package_size);
  return `${parts.join(" · ")} (${p.unit})${p.barcode ? ` · EAN ${p.barcode}` : ""}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; added?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { q, added } = await searchParams;
  const query = (q ?? "").trim();

  const sql = getSql();
  const profile = await getProfile(userId);

  const products =
    query.length >= 1
      ? await sql`
          select
            p.id, p.name, p.brand, p.unit, p.package_size, p.barcode, p.subcategory, p.image_url, p.is_global,
            c.name as category_name, c.icon as category_icon
          from public.search_catalog_products(${query}, ${userId}::uuid, ${50}) sc
          join products p on p.id = sc.id
          left join categories c on c.id = p.category_id
          order by sc.rank_score desc, p.name
        `
      : await sql`
          select
            p.id, p.name, p.brand, p.unit, p.package_size, p.barcode, p.subcategory, p.image_url, p.is_global,
            c.name as category_name, c.icon as category_icon
          from products p
          left join categories c on c.id = p.category_id
          where p.is_global = true
          order by p.name
          limit 80
        `;

  const categories = await sql`
    select id, name from categories order by display_order, name
  `;

  const favRows = await sql`
    select product_id from favorite_products where user_id = ${userId}
  `;
  const favSet = new Set(favRows.map((f) => f.product_id as string));

  async function createProductAction(formData: FormData) {
    "use server";
    await createCatalogProduct(formData);
    redirect("/products?added=1");
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Catálogo</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Selecione produtos existentes ao montar listas. Novos itens entram no catálogo com EAN quando possível.
      </p>

      {added === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Produto adicionado ao catálogo.
        </div>
      )}

      <form method="get" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Buscar por nome, marca ou EAN…"
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 text-sm font-medium shrink-0"
        >
          Buscar
        </button>
      </form>

      <details className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
        <summary className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          Adicionar produto ao catálogo
        </summary>
        <form action={createProductAction} className="mt-3 space-y-2">
          <input
            name="barcode"
            inputMode="numeric"
            placeholder="Código de barras (EAN) — recomendado"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            name="name"
            required
            placeholder="Nome (ex.: Arroz tipo 1)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="brand"
              placeholder="Marca"
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              name="package_size"
              placeholder="Embalagem (ex.: 5kg)"
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="unit"
              defaultValue="un"
              placeholder="Unidade (kg, L, un)"
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <select
              name="category_id"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="">Categoria</option>
              {categories.map((c) => (
                <option key={c.id as string} value={c.id as string}>
                  {c.name as string}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 py-2 text-sm font-medium"
          >
            Publicar no catálogo
          </button>
        </form>
      </details>

      <ul className="space-y-2">
        {products.map((p) => {
          const fav = favSet.has(p.id as string);
          return (
            <li
              key={p.id as string}
              className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
            >
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url as string}
                  alt=""
                  className="h-12 w-12 rounded-lg object-contain bg-slate-50 dark:bg-slate-800 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-white text-sm leading-snug">
                  {productLabel({
                    name: p.name as string,
                    brand: p.brand as string | null,
                    package_size: p.package_size as string | null,
                    unit: p.unit as string,
                    barcode: p.barcode as string | null,
                  })}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {p.category_icon as string} {p.category_name as string}
                  {p.subcategory ? ` · ${p.subcategory as string}` : ""}
                  {p.is_global ? " · catálogo" : " · seu cadastro"}
                </p>
              </div>
              <form action={toggleFavoriteFromForm}>
                <input type="hidden" name="product_id" value={p.id as string} />
                <input type="hidden" name="next_favorited" value={fav ? "0" : "1"} />
                <button
                  type="submit"
                  className={`p-2 rounded-xl ${fav ? "text-amber-500" : "text-slate-300"}`}
                  aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
                >
                  <Star className="h-5 w-5" fill={fav ? "currentColor" : "none"} />
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {products.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          Nenhum produto encontrado.{" "}
          {query ? "Tente outro termo ou cadastre acima." : "Rode neon/seed.sql ou cadastre um produto."}
        </p>
      )}

      {!profile?.city && (
        <p className="text-xs text-center text-slate-500">
          <Link href="/profile" className="text-emerald-600 font-medium">
            Defina sua cidade no perfil
          </Link>{" "}
          para filtrar preços na região.
        </p>
      )}
    </div>
  );
}
