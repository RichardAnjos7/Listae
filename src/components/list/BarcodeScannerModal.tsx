"use client";

import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
};

export function BarcodeScannerModal({ open, onClose, onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const regionId = "ilist-barcode-scanner";

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decoded) => {
            if (cancelled) return;
            onScan(decoded);
            void scanner.stop().then(() => scanner.clear());
            scannerRef.current = null;
            onClose();
          },
          () => {}
        );
      } catch {
        if (!cancelled) setError("Não foi possível acessar a câmera. Digite o EAN manualmente.");
      }
    };

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        void scanner.stop().then(() => scanner.clear()).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Escanear código de barras</span>
        <button type="button" onClick={onClose} className="p-1" aria-label="Fechar">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div id={regionId} className="w-full max-w-sm overflow-hidden rounded-xl" />
        {error && <p className="text-amber-200 text-sm text-center mt-4">{error}</p>}
        <p className="text-slate-400 text-xs text-center mt-4">
          Aponte para o código de barras do produto
        </p>
      </div>
    </div>
  );
}
