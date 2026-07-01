"use client";

import { CurrencyInput } from "@/components/list/CurrencyInput";
import { ProductImagePicker } from "@/components/products/ProductImagePicker";
import { suggestProductAttributes } from "@/lib/actions/products";
import { inferFromDictionary, parsePackageFromName, resolveCategoryId } from "@/lib/catalog/infer-product";
import { PRODUCT_UNITS } from "@/lib/catalog/units";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  icon?: string | null;
};

type MarketOption = {
  id: string;
  name: string;
  city: string | null;
  chain_name: string | null;
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
  markets?: MarketOption[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  productId?: string;
  initial?: InitialValues;
  enableSuggestions?: boolean;
  /** false = admin publica direto; true = foto vai para staging até aprovação */
  imageStaging?: boolean;
};

export function CatalogProductForm({
  categories,
  markets = [],
  action,
  submitLabel,
  productId,
  initial,
  enableSuggestions = true,
  imageStaging = true,
}: Props) {
  const isEdit = Boolean(productId);
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "kg");
  const [packageAmount, setPackageAmount] = useState(initial?.packageAmount ?? "1");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [suggestionHint, setSuggestionHint] = useState<string | null>(null);
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [supermarketId, setSupermarketId] = useState("");
  const [isPromotion, setIsPromotion] = useState(false);
  const [validUntil, setValidUntil] = useState("");
  const [showPriceSection, setShowPriceSection] = useState(false);
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

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
      fromName?: boolean;
    }) => {
      let hint: string | null = null;
      if (s.unit && !unitTouched.current) {
        setUnit(s.unit);
      }
      if (s.packageAmount && !amountTouched.current) {
        setPackageAmount(s.packageAmount);
      }
      if (!categoryTouched.current && s.categoryName) {
        const resolved =
          s.categoryId ?? resolveCategoryId(s.categoryName, categories);
        if (resolved) {
          setCategoryId(resolved);
          const catName = categories.find((c) => c.id === resolved)?.name ?? s.categoryName;
          if (catName && s.unit) {
            const prefix = s.fromName ? "No nome" : "Sugerido";
            hint = `${prefix}: ${catName} · ${s.packageAmount ?? "1"} ${s.unit}`;
          }
        }
      } else if (s.fromName && s.unit && s.packageAmount && !categoryTouched.current) {
        hint = `No nome: ${s.packageAmount} ${s.unit}`;
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

    const fromName = parsePackageFromName(q);
    if (fromName) {
      applySuggestion({
        unit: fromName.unit,
        categoryId: null,
        categoryName: null,
        packageAmount: fromName.packageAmount,
        fromName: true,
      });
    }

    const dict = inferFromDictionary(q);
    if (dict) {
      applySuggestion({
        unit: dict.unit,
        categoryId: resolveCategoryId(dict.categoryName, categories),
        categoryName: dict.categoryName || null,
        packageAmount: dict.packageAmount,
        fromName: Boolean(fromName),
      });
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void suggestProductAttributes(q).then((server) => {
        if (!cancelled && server.source) {
          applySuggestion({
            ...server,
            fromName: Boolean(fromName),
          });
        }
      });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, enableSuggestions, isEdit, categories, applySuggestion]);

  const marketLabel = (m: MarketOption) => {
    const parts = [m.name];
    if (m.chain_name) parts.push(m.chain_name);
    if (m.city) parts.push(m.city);
    return parts.join(" · ");
  };

  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={(e) => {
        if (imageUploading) {
          e.preventDefault();
        }
      }}
    >
      {productId && <input type="hidden" name="product_id" value={productId} />}
      <input type="hidden" name="image_url" value={imageUrl ?? ""} />
      <input
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome (ex.: Arroz Tio João 5kg)"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
      />
      <input
        name="brand"
        defaultValue={initial?.brand ?? ""}
        placeholder="Marca (opcional)"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
      />
      {suggestionHint && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 px-1 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
          {suggestionHint}
        </p>
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

      {!isEdit && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-3 space-y-2">
          <button
            type="button"
            onClick={() => setShowPriceSection((v) => !v)}
            className="w-full text-left text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            {showPriceSection ? "▼" : "▶"} Contribuir com preço (opcional)
          </button>

          {showPriceSection && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-slate-500">
                O preço aparece no feed da cidade e no dashboard para outros usuários.
              </p>
              <input type="hidden" name="unit_price" value={unitPrice ?? ""} />
              <input type="hidden" name="is_promotion" value={isPromotion ? "1" : "0"} />
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Preço (R$)</label>
                <CurrencyInput
                  value={unitPrice}
                  onChange={setUnitPrice}
                  placeholder="0,00"
                  aria-label="Preço do produto"
                  className="rounded-xl"
                />
              </div>
              {markets.length > 0 && (
                <div>
                  <label htmlFor="catalog-supermarket" className="text-xs text-slate-500 mb-1 block">
                    Supermercado (opcional)
                  </label>
                  <select
                    id="catalog-supermarket"
                    name="supermarket_id"
                    value={supermarketId}
                    onChange={(e) => setSupermarketId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="">Não informar</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {marketLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isPromotion}
                  onChange={(e) => setIsPromotion(e.target.checked)}
                  className="rounded border-slate-300"
                />
                É promoção
              </label>
              {isPromotion && (
                <div>
                  <label htmlFor="catalog-valid-until" className="text-xs text-slate-500 mb-1 block">
                    Válido até
                  </label>
                  <input
                    id="catalog-valid-until"
                    name="valid_until"
                    type="date"
                    value={validUntil}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isEdit && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-3 space-y-2">
          <button
            type="button"
            onClick={() => setShowPhotoSection((v) => !v)}
            className="w-full text-left text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            {showPhotoSection ? "▼" : "▶"} Adicionar foto (opcional)
          </button>
          {showPhotoSection && (
            <ProductImagePicker
              imageUrl={imageUrl}
              onImageUrlChange={setImageUrl}
              onUploadingChange={setImageUploading}
              staging={imageStaging}
            />
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={imageUploading}
        className="w-full rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 py-2 text-sm font-medium disabled:opacity-50"
      >
        {imageUploading ? "Enviando foto…" : submitLabel}
      </button>
    </form>
  );
}
