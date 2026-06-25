"use client";

import { suggestProductAttributes } from "@/lib/actions/products";
import { inferFromDictionary, resolveCategoryId } from "@/lib/catalog/infer-product";
import { PRODUCT_UNITS } from "@/lib/catalog/units";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  icon?: string | null;
};

type InitialValues = {
  name?: string;
  brand?: string;
  unit?: string;
  packageAmount?: string;
  categoryId?: string;
};

type Props = {
  categories: CategoryOption[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  productId?: string;
  initial?: InitialValues;
  enableSuggestions?: boolean;
};

export function CatalogProductForm({
  categories,
  action,
  submitLabel,
  productId,
  initial,
  enableSuggestions = true,
}: Props) {
  const isEdit = Boolean(productId);
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "kg");
  const [packageAmount, setPackageAmount] = useState(initial?.packageAmount ?? "1");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null);

  const unitTouched = useRef(isEdit);
  const categoryTouched = useRef(isEdit);
  const amountTouched = useRef(isEdit);

  const unitDef = useMemo(() => PRODUCT_UNITS.find((u) => u.value === unit) ?? PRODUCT_UNITS[0], [unit]);

  const applySuggestion = useCallback(
    (s: {
      unit: string | null;
      categoryId: string | null;
      categoryName: string | null;
      packageAmount: string | null;
    }) => {
      let hint: string | null = null;
      if (s.unit && !unitTouched.current) {
        setUnit(s.unit);
      }
      if (s.packageAmount && !amountTouched.current) {
        setPackageAmount(s.packageAmount);
      }
      if (!categoryTouched.current) {
        const resolved =
          s.categoryId ?? resolveCategoryId(s.categoryName, categories);
        if (resolved) {
          setCategoryId(resolved);
          const catName = categories.find((c) => c.id === resolved)?.name ?? s.categoryName;
          if (catName && s.unit) {
            hint = `Sugerido: ${catName} · ${s.packageAmount ?? "1"} ${s.unit}`;
          }
        }
      }
      setSuggestionHint(hint);
    },
    [categories]
  );

  useEffect(() => {
    if (!enableSuggestions || isEdit) return;
    const q = name.trim();
    if (q.length < 2) {
      setSuggestionHint(null);
      return;
    }

    const dict = inferFromDictionary(q);
    if (dict) {
      applySuggestion({
        unit: dict.unit,
        categoryId: resolveCategoryId(dict.categoryName, categories),
        categoryName: dict.categoryName,
        packageAmount: dict.packageAmount,
      });
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void suggestProductAttributes(q).then((server) => {
        if (!cancelled && server.source) applySuggestion(server);
      });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, enableSuggestions, isEdit, categories, applySuggestion]);

  return (
    <form action={action} className="space-y-2">
      {productId && <input type="hidden" name="product_id" value={productId} />}
      <input
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome (ex.: Arroz tipo 1)"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
      />
      <input
        name="brand"
        defaultValue={initial?.brand ?? ""}
        placeholder="Marca"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
      />
      {suggestionHint && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 px-1">{suggestionHint}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`unit-${productId ?? "new"}`} className="sr-only">
            Embalagem / Unidade
          </label>
          <select
            id={`unit-${productId ?? "new"}`}
            name="unit"
            value={unit}
            onChange={(e) => {
              unitTouched.current = true;
              setUnit(e.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        {unitDef.needsAmount && (
          <div>
            <label htmlFor={`amount-${productId ?? "new"}`} className="sr-only">
              {unitDef.amountLabel}
            </label>
            <input
              id={`amount-${productId ?? "new"}`}
              name="package_amount"
              required
              inputMode="decimal"
              value={packageAmount}
              onChange={(e) => {
                amountTouched.current = true;
                setPackageAmount(e.target.value);
              }}
              placeholder={unitDef.amountPlaceholder}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
      <select
        name="category_id"
        required
        value={categoryId}
        onChange={(e) => {
          categoryTouched.current = true;
          setCategoryId(e.target.value);
        }}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Categoria
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon ? `${c.icon} ` : ""}
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 py-2 text-sm font-medium"
      >
        {submitLabel}
      </button>
    </form>
  );
}
