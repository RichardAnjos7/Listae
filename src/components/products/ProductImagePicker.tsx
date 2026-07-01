"use client";

import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  imageUrl: string | null;
  onImageUrlChange: (url: string | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
};

export function ProductImagePicker({
  imageUrl,
  onImageUrlChange,
  onUploadingChange,
  disabled,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/catalog/product-image", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha no upload");
      if (!json.url) throw new Error("URL da imagem não retornada");
      onImageUrlChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar imagem");
      onImageUrlChange(null);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  function clearImage() {
    onImageUrlChange(null);
    setError(null);
  }

  return (
    <div className="space-y-2">
      {imageUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Preview do produto"
            className="h-16 w-16 rounded-xl object-contain bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          />
          <button
            type="button"
            onClick={clearImage}
            disabled={disabled || uploading}
            className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Remover foto
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Tirar foto
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => galleryRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" />
            Galeria
          </button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={onPick}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={onPick}
      />

      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
