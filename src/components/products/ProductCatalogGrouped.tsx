"use client";

import { ProductCatalogRow } from "@/components/products/ProductCatalogRow";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

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
  category_display_order: number;
  subcategory: string | null;
  image_url: string | null;
  is_global: boolean;
};

type Props = {
  products: Product[];
  favSet: Set<string>;
  canManage: boolean;
  categories: CategoryOption[];
};

export function ProductCatalogGrouped({ products, favSet, canManage, categories }: Props) {
  const sortedGroups = useMemo(() => {
    const groups = new Map<
      string,
      { categoryName: string; categoryIcon: string | null; displayOrder: number; items: Product[] }
    >();

    for (const p of products) {
      const key = p.category_id ?? "__none__";
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(p);
      } else {
        groups.set(key, {
          categoryName: p.category_name ?? "Sem categoria",
          categoryIcon: p.category_icon,
          displayOrder: p.category_display_order ?? 9999,
          items: [p],
        });
      }
    }

    return [...groups.entries()].sort(([, a], [, b]) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return a.categoryName.localeCompare(b.categoryName, "pt-BR");
    });
  }, [products]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (sortedGroups.length === 0) return null;

  const allCollapsed = sortedGroups.every(([key]) => collapsed.has(key));

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(sortedGroups.map(([key]) => key)));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end px-1">
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          {allCollapsed ? "Expandir todas" : "Recolher todas"}
        </button>
      </div>

      <div className="space-y-2">
        {sortedGroups.map(([key, group]) => {
          const isOpen = !collapsed.has(key);
          return (
            <section
              key={key}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                />
                {group.categoryIcon && <span className="text-base leading-none">{group.categoryIcon}</span>}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">
                  {group.categoryName}
                </span>
                <span className="text-xs font-normal text-slate-400 shrink-0">({group.items.length})</span>
              </button>

              {isOpen && (
                <ul className="space-y-2 px-2 pb-2">
                  {group.items.map((p) => (
                    <ProductCatalogRow
                      key={p.id}
                      product={p}
                      favorited={favSet.has(p.id)}
                      canManage={canManage}
                      categories={categories}
                      compact
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
