"use client";

import { searchCatalogProducts } from "@/lib/actions/products";
import { useCallback, useState } from "react";

type Hit = { id: string; name: string; brand: string | null; package_size: string | null };

export function AlertProductSearch({
  onSelect,
}: {
  onSelect?: (product: { id: string; name: string }) => void;
} = {}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const data = await searchCatalogProducts(q);
    setHits(
      data.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        package_size: p.package_size,
      }))
    );
  }, []);

  return (
    <div className="space-y-2">
      <input type="hidden" name="product_id" value={selected?.id ?? ""} />
      <input
        placeholder="Buscar produto (mín. 2 letras)…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          void search(e.target.value);
        }}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
      />
      {selected && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Selecionado: <strong>{selected.name}</strong>
        </p>
      )}
      {!selected && hits.length > 0 && (
        <ul className="max-h-36 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 text-sm">
          {hits.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected({ id: p.id, name: p.name });
                  setQuery(p.name);
                  setHits([]);
                  onSelect?.({ id: p.id, name: p.name });
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {p.name}
                {p.brand && <span className="text-slate-400 text-xs ml-1">· {p.brand}</span>}
                {p.package_size && (
                  <span className="text-slate-400 text-xs ml-1">· {p.package_size}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
