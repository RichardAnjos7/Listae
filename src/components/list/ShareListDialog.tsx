"use client";

import { QrCode, Share2, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  open: boolean;
  shareUrl: string | null;
  listName: string;
  onClose: () => void;
  onCopyLink: () => void;
  onNativeShare?: () => void;
};

export function ShareListDialog({
  open,
  shareUrl,
  listName,
  onClose,
  onCopyLink,
  onNativeShare,
}: Props) {
  if (!open || !shareUrl) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 px-3 pt-3 pb-[calc(var(--app-nav-inset)+0.75rem)] sm:p-3">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              Compartilhar lista
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{listName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Peça para escanear o QR code ou abrir o link.
        </p>

        <div className="flex justify-center bg-white p-3 rounded-xl">
          <QRCodeSVG value={shareUrl} size={180} level="M" />
        </div>

        <p className="text-xs text-slate-500 break-all text-center">{shareUrl}</p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onCopyLink}
            className="w-full rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-medium hover:bg-emerald-700"
          >
            Copiar link
          </button>
          {onNativeShare && (
            <button
              type="button"
              onClick={onNativeShare}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar via app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
