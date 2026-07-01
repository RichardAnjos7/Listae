import { createCatalogProduct } from "@/lib/actions/products";
import {
  approveCatalogSubmissionFromForm,
  getPendingCatalogSubmissions,
  getUserPendingSubmissions,
  rejectCatalogSubmissionFromForm,
  submitCatalogProduct,
} from "@/lib/actions/catalog-submissions";
import { getProfile } from "@/lib/actions/profile";
import { getSessionUserId, requireUserId } from "@/lib/auth/session";
import { isSuperDev } from "@/lib/auth/super-dev";
import { AddProductCatalog } from "@/components/products/AddProductCatalog";
import { CatalogSubmissionQueue } from "@/components/products/CatalogSubmissionQueue";
import { ProductCatalogGrouped } from "@/components/products/ProductCatalogGrouped";
import { UserPendingSubmissions } from "@/components/products/UserPendingSubmissions";
import { getSql } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    added?: string;
    submitted?: string;
    approved?: string;
    rejected?: string;
    updated?: string;
    deleted?: string;
  }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { q, added, submitted, approved, rejected, updated, deleted } = await searchParams;
  const query = (q ?? "").trim();
  const canManage = await isSuperDev(userId);

  const sql = getSql();
  const profile = await getProfile(userId);
  const userCity = profile?.city?.trim() || null;

  const marketsQuery = userCity
    ? sql`
        select distinct sm.id, sm.name, sm.city, rc.name as chain_name
        from supermarkets sm
        left join retail_chains rc on rc.id = sm.chain_id
        where sm.user_id = ${userId}
           or lower(trim(coalesce(sm.city, ''))) = lower(trim(${userCity}))
        order by sm.name
        limit 60
      `
    : sql`
        select distinct sm.id, sm.name, sm.city, rc.name as chain_name
        from supermarkets sm
        left join retail_chains rc on rc.id = sm.chain_id
        where sm.user_id = ${userId}
        order by sm.name
        limit 60
      `;

  const [products, categories, markets, pendingForAdmin, userPending] = await Promise.all([
    query.length >= 1
      ? sql`
          select
            p.id, p.name, p.brand, p.unit, p.package_size, p.barcode, p.subcategory, p.image_url, p.is_global,
            p.category_id,
            c.name as category_name, c.icon as category_icon,
            coalesce(c.display_order, 9999) as category_display_order
          from public.search_catalog_products(${query}, ${userId}::uuid, ${50}) sc
          join products p on p.id = sc.id
          left join categories c on c.id = p.category_id
          order by category_display_order asc, c.name asc, sc.rank_score desc, p.name asc
        `
      : sql`
          select
            p.id, p.name, p.brand, p.unit, p.package_size, p.barcode, p.subcategory, p.image_url, p.is_global,
            p.category_id,
            c.name as category_name, c.icon as category_icon,
            coalesce(c.display_order, 9999) as category_display_order
          from products p
          left join categories c on c.id = p.category_id
          where p.is_global = true
          order by category_display_order asc, c.name asc, p.name asc
          limit 120
        `,
    sql`select id, name, icon from categories order by display_order, name`,
    marketsQuery,
    canManage ? getPendingCatalogSubmissions() : Promise.resolve([]),
    getUserPendingSubmissions(userId),
  ]);

  const favRows = await sql`
    select product_id from favorite_products where user_id = ${userId}
  `;
  const favSet = new Set(favRows.map((f) => f.product_id as string));

  const categoryOptions = categories.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    icon: c.icon as string | null,
  }));

  const marketOptions = markets.map((m) => ({
    id: m.id as string,
    name: m.name as string,
    city: m.city as string | null,
    chain_name: m.chain_name as string | null,
  }));

  const productRows = products.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    brand: p.brand as string | null,
    package_size: p.package_size as string | null,
    unit: p.unit as string,
    barcode: p.barcode as string | null,
    category_id: p.category_id as string | null,
    category_name: p.category_name as string | null,
    category_icon: p.category_icon as string | null,
    category_display_order: Number(p.category_display_order ?? 9999),
    subcategory: p.subcategory as string | null,
    image_url: p.image_url as string | null,
    is_global: Boolean(p.is_global),
  }));

  async function submitProductAction(formData: FormData) {
    "use server";
    const uid = await requireUserId();
    if (await isSuperDev(uid)) {
      await createCatalogProduct(formData);
      redirect("/products?added=1");
    } else {
      await submitCatalogProduct(formData);
      redirect("/products?submitted=1");
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Catálogo</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {canManage
              ? "Produtos agrupados por categoria. Você publica direto; outros usuários passam por revisão."
              : "Produtos agrupados por categoria. Suas sugestões são revisadas antes de entrar no catálogo."}
          </p>
        </div>
        <AddProductCatalog
          categories={categoryOptions}
          markets={marketOptions}
          action={submitProductAction}
          submitLabel={canManage ? "Publicar no catálogo" : "Enviar para revisão"}
          imageStaging={!canManage}
        />
      </div>

      {submitted === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Sugestão enviada! Você receberá uma notificação quando for revisada.
        </div>
      )}
      {added === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Produto publicado no catálogo. Se informou preço, ele já aparece na comunidade da sua cidade.
        </div>
      )}
      {approved === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Produto aprovado e publicado no catálogo.
        </div>
      )}
      {rejected === "1" && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
          Submissão rejeitada.
        </div>
      )}
      {updated === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Produto atualizado.
        </div>
      )}
      {deleted === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Produto excluído.
        </div>
      )}

      {canManage && pendingForAdmin.length > 0 && (
        <CatalogSubmissionQueue
          submissions={pendingForAdmin}
          approveAction={approveCatalogSubmissionFromForm}
          rejectAction={rejectCatalogSubmissionFromForm}
        />
      )}

      {!canManage && <UserPendingSubmissions submissions={userPending} />}

      <form method="get" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Buscar por nome, marca ou embalagem…"
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 text-sm font-medium shrink-0"
        >
          Buscar
        </button>
      </form>

      <ProductCatalogGrouped
        products={productRows}
        favSet={favSet}
        canManage={canManage}
        categories={categoryOptions}
      />

      {productRows.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          Nenhum produto encontrado.{" "}
          {query ? "Tente outro termo ou clique em Adicionar." : "Clique em Adicionar para sugerir um produto."}
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
