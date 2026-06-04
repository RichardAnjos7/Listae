import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { toggleFavoriteFromForm } from "@/lib/actions/lists";
import { Star } from "lucide-react";

export default async function ProductsPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const sql = getSql();
  const products = await sql`
    select
      p.id,
      p.name,
      p.brand,
      p.unit,
      c.name as category_name,
      c.icon as category_icon
    from products p
    left join categories c on c.id = p.category_id
    order by p.name
    limit 200
  `;

  const favRows = await sql`
    select product_id from favorite_products where user_id = ${userId}
  `;
  const favSet = new Set(favRows.map((f) => f.product_id as string));

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Produtos</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Base para adicionar às listas. Toque na estrela para favoritar.
      </p>

      <ul className="space-y-2">
        {products.map((p) => {
          const fav = favSet.has(p.id as string);
          return (
            <li
              key={p.id as string}
              className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{p.name as string}</p>
                <p className="text-xs text-slate-500 truncate">
                  {p.category_icon as string} {p.category_name as string}
                  {p.brand && ` · ${p.brand as string}`} · {p.unit as string}
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
        <p className="text-sm text-slate-500 text-center py-12">
          Nenhum produto. Rode o seed SQL no Neon (veja neon/seed.sql).
        </p>
      )}
    </div>
  );
}
