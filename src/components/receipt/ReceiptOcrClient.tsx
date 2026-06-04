"use client";

import {
  confirmReceiptImport,
  matchReceiptLines,
  type ConfirmReceiptLine,
  type ReceiptLineMatch,
} from "@/lib/actions/receipt";
import { parseReceiptText, type ParsedReceiptLine } from "@/lib/receipt/parse-receipt-text";
import { formatBRL } from "@/lib/utils";
import { Camera, Check, Loader2, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type MarketOption = { id: string; name: string };

type EditableLine = ReceiptLineMatch & { included: boolean };

export function ReceiptOcrClient({ markets }: { markets: MarketOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [ocrProgress, setOcrProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supermarketId, setSupermarketId] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [importResult, setImportResult] = useState<{ listId: string; itemCount: number } | null>(
    null
  );

  const runOcr = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    setOcrProgress("Carregando OCR…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      setOcrProgress("Lendo imagem…");
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const parsed: ParsedReceiptLine[] = parseReceiptText(data.text);
      if (parsed.length === 0) {
        setError(
          "Não encontramos itens com preço na imagem. Tente foto mais nítida ou luz melhor."
        );
        return;
      }

      setOcrProgress("Vinculando ao catálogo…");
      const matched = await matchReceiptLines(parsed);
      setLines(
        matched.map((m) => ({
          ...m,
          included: Boolean(m.productId),
        }))
      );
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no OCR");
    } finally {
      setBusy(false);
      setOcrProgress("");
    }
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void runOcr(file);
  };

  const updateLine = (index: number, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleConfirm = async () => {
    const payload: ConfirmReceiptLine[] = lines
      .filter((l) => l.included && l.productId)
      .map((l) => ({
        productId: l.productId!,
        rawName: l.rawName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      }));

    if (payload.length === 0) {
      setError("Marque ao menos um item com produto do catálogo.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await confirmReceiptImport({
        supermarketId: supermarketId || null,
        lines: payload,
      });
      setImportResult({ listId: res.listId, itemCount: res.itemCount });
      setStep("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done" && importResult) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 p-6 text-center space-y-3">
        <Check className="h-10 w-10 text-emerald-600 mx-auto" />
        <p className="font-medium text-emerald-900 dark:text-emerald-100">
          {importResult.itemCount} itens importados da nota
        </p>
        <button
          type="button"
          onClick={() => router.push(`/lists/${importResult.listId}`)}
          className="w-full rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-medium"
        >
          Ver compra
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("upload");
            setLines([]);
            setImportResult(null);
          }}
          className="w-full text-sm text-slate-500"
        >
          Escanear outra nota
        </button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Supermercado (opcional)
          </label>
          <select
            value={supermarketId}
            onChange={(e) => setSupermarketId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-500">
          Revise os itens detectados. Desmarque linhas erradas e confira o vínculo ao catálogo.
        </p>

        <ul className="space-y-2 max-h-[50vh] overflow-auto">
          {lines.map((line, i) => (
            <li
              key={`${line.rawName}-${i}`}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm bg-white dark:bg-slate-900"
            >
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={line.included}
                  onChange={(e) => updateLine(i, { included: e.target.checked })}
                  className="mt-1"
                />
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900 dark:text-white block truncate">
                    {line.rawName}
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    {formatBRL(line.unitPrice)}
                    {line.quantity !== 1 && (
                      <span className="text-slate-400 font-normal text-xs ml-1">
                        × {line.quantity}
                      </span>
                    )}
                  </span>
                  {line.productId ? (
                    <span className="text-xs text-slate-500 block">
                      Catálogo: {line.productName}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 block">
                      Sem match no catálogo — item será ignorado
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleConfirm()}
          className="w-full rounded-xl bg-emerald-600 text-white font-medium py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Confirmar e gravar preços
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
        <ScanLine className="h-10 w-10 text-emerald-600" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
          Foto da nota fiscal ou cupom
        </span>
        <span className="text-xs text-slate-500 text-center flex items-center gap-1">
          <Camera className="h-3.5 w-3.5" />
          PNG, JPG — OCR em português (Tesseract)
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={onFile}
        />
      </label>

      {busy && (
        <p className="text-sm text-slate-500 flex items-center gap-2 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          {ocrProgress || "Processando…"}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <p className="text-xs text-slate-500 text-center">
        Após o OCR, confira cada item antes de publicar na base de preços.
      </p>
    </div>
  );
}
