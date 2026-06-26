"use client";

import { useState, useTransition } from "react";
import { Bell, Loader2, Plus, X } from "lucide-react";
import { AlertProductSearch } from "@/components/alerts/AlertProductSearch";
import { createPriceAlert } from "@/lib/actions/alerts";

type AlertType = "below_price" | "rise_pct";
type PresetProduct = { id: string; name: string };

function AlertModal({
  defaultCity,
  presetProduct,
  onClose,
}: {
  defaultCity: string;
  presetProduct?: PresetProduct;
  onClose: () => void;
}) {
  const [type, setType] = useState<AlertType>("below_price");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    const productId = String(formData.get("product_id") ?? "").trim();
    if (!productId) {
      setError("Selecione um produto na busca acima.");
      return;
    }
    if (type === "below_price") {
      const target = Number.parseFloat(String(formData.get("target_price") ?? "").replace(",", "."));
      if (!target || target <= 0) {
        setError("Informe o preço alvo (R$).");
        return;
      }
    } else {
      const pct = Number.parseFloat(String(formData.get("threshold_pct") ?? "").replace(",", "."));
      if (!pct || pct <= 0) {
        setError("Informe o percentual de alta.");
        return;
      }
    }

    startTransition(async () => {
      try {
        await createPriceAlert(formData);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível criar o alerta.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-alert-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="new-alert-title"
            className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"
          >
            <Bell className="h-5 w-5 text-amber-500" />
            Novo alerta
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Produto</label>
            {presetProduct ? (
              <div className="mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                {presetProduct.name}
                <input type="hidden" name="product_id" value={presetProduct.id} />
              </div>
            ) : (
              <div className="mt-1">
                <AlertProductSearch />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="alert_type"
              className="text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Tipo
            </label>
            <select
              id="alert_type"
              name="alert_type"
              value={type}
              onChange={(e) => setType(e.target.value as AlertType)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="below_price">Preço até (oferta)</option>
              <option value="rise_pct">Alta acima de %</option>
            </select>
          </div>

          {type === "below_price" ? (
            <div>
              <label
                htmlFor="target_price"
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Preço alvo (R$)
              </label>
              <input
                id="target_price"
                name="target_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex.: 3,39"
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Avisa quando o preço ficar igual ou abaixo desse valor.
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="threshold_pct"
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                % de alta
              </label>
              <input
                id="threshold_pct"
                name="threshold_pct"
                type="number"
                step="1"
                min="1"
                defaultValue={10}
                placeholder="Ex.: 10"
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Avisa quando o preço subir esse percentual ou mais.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="city" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Cidade
            </label>
            <input
              id="city"
              name="city"
              placeholder="Cidade"
              defaultValue={defaultCity}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Deixe vazio para usar a cidade do seu perfil.
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Criando…" : "Criar alerta"}
            </button>
          </div>
        </form>

        <p className="text-[10px] text-slate-500">
          Disparo no máximo 1× por 24h por alerta.
        </p>
      </div>
    </div>
  );
}

export function NewAlertDialog({
  defaultCity,
  presetProduct,
  variant = "default",
}: {
  defaultCity: string;
  presetProduct?: PresetProduct;
  variant?: "default" | "icon";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={presetProduct ? `Criar alerta para ${presetProduct.name}` : "Criar alerta"}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40"
        >
          <Bell className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo alerta
        </button>
      )}
      {open && (
        <AlertModal
          defaultCity={defaultCity}
          presetProduct={presetProduct}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
