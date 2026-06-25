"use client";

import {
  deleteCatalogProductFromForm,
  updateCatalogProductFromForm,
} from "@/lib/actions/products";
import { parsePackageSize } from "@/lib/catalog/units";
import { toggleFavoriteFromForm } from "@/lib/actions/lists";
import { CatalogProductForm } from "@/components/products/CatalogProductForm";
import { Pencil, Star, Trash2, X } from "lucide-react";
import { useState } from "react";

type CategoryOption = { id: string; name: string; icon?: string | null };

type Product = {
  id: string;
  name: string;
  brand: string | null;
  package_size: string | null;
  unit: string;
  barcode: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_id: string | null;
  subcategory: string | null;
  image_url: string | null;
  is_global: boolean;
};

function productLabel(p: Pick<Product, "name" | "brand" | "package_size" | "unit">) {
  const parts = [p.name];
  if (p.brand) parts.push(p.brand);
  if (p.package_size) parts.push(p.package_size);
  return `${parts.join(" · ")} (${p.unit})`;
}

type Props = {
  product: Product;
  favorited: boolean;
  canManage: boolean;
  categories: CategoryOption[];
  compact?: boolean;
};

export function ProductCatalogRow({ product, favorited, canManage, categories, compact }: Props) {
  const [editing, setEditing] = useState(false);
  const parsed = parsePackageSize(product.package_size, product.unit);

  return (
    <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm space-y-3">
      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Editar produto</p>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="p-1 text-slate-400"
              aria-label="Cancelar edição"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <CatalogProductForm
            categories={categories}
            action={updateCatalogProductFromForm}
            submitLabel="Salvar alterações"
            productId={product.id}
            enableSuggestions={false}
            initial={{
              name: product.name,
              brand: product.brand ?? "",
              unit: parsed.unit,
              packageAmount: parsed.amount,
              categoryId: product.category_id ?? "",
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt=""
              className="h-12 w-12 rounded-lg object-contain bg-slate-50 dark:bg-slate-800 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-white text-sm leading-snug">
              {productLabel(product)}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {!compact && (
                <>
                  {product.category_icon} {product.category_name}
                  {product.subcategory ? ` · ${product.subcategory}` : ""}
                  {product.subcategory || product.category_name ? " · " : ""}
                </>
              )}
              {product.is_global ? "catálogo" : "seu cadastro"}
              {compact && product.subcategory ? ` · ${product.subcategory}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-emerald-600"
                  aria-label="Editar produto"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <form action={deleteCatalogProductFromForm}>
                  <input type="hidden" name="product_id" value={product.id} />
                  <button
                    type="submit"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600"
                    aria-label="Excluir produto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
            <form action={toggleFavoriteFromForm}>
              <input type="hidden" name="product_id" value={product.id} />
              <input type="hidden" name="next_favorited" value={favorited ? "0" : "1"} />
              <button
                type="submit"
                className={`p-2 rounded-xl ${favorited ? "text-amber-500" : "text-slate-300"}`}
                aria-label={favorited ? "Remover dos favoritos" : "Favoritar"}
              >
                <Star className="h-5 w-5" fill={favorited ? "currentColor" : "none"} />
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
