import { copy, del } from "@vercel/blob";

export function blobAccess(): "public" | "private" {
  const raw = process.env.BLOB_ACCESS?.trim().toLowerCase();
  return raw === "public" ? "public" : "private";
}

/** URL relativa para exibir blob privado via proxy da API. */
export function productImageServePath(pathname: string): string {
  return `/api/catalog/product-image?p=${encodeURIComponent(pathname)}`;
}

/** Extrai pathname do blob a partir do campo do formulário (URL de proxy ou pathname). */
export function parseBlobPathname(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("staging/") || raw.startsWith("products/")) return raw;
  try {
    const url = raw.startsWith("/") ? new URL(raw, "http://local") : new URL(raw);
    const p = url.searchParams.get("p");
    if (p && (p.startsWith("staging/") || p.startsWith("products/"))) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function isStagingPath(pathname: string): boolean {
  return pathname.startsWith("staging/");
}

export function stagingOwnerId(pathname: string): string | null {
  const match = /^staging\/([^/]+)\//.exec(pathname);
  return match?.[1] ?? null;
}

export async function promoteStagingImage(
  stagingPath: string,
  productId: string
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  const ext = stagingPath.includes(".") ? stagingPath.slice(stagingPath.lastIndexOf(".")) : ".jpg";
  const finalPath = `products/${productId}/${Date.now()}${ext}`;
  const access = blobAccess();

  const result = await copy(stagingPath, finalPath, { access });
  try {
    await del(stagingPath);
  } catch {
    /* staging cleanup é best-effort */
  }

  return access === "private" ? productImageServePath(finalPath) : result.url;
}

export async function deleteBlobPath(pathname: string | null | undefined): Promise<void> {
  if (!pathname?.trim() || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(pathname);
  } catch {
    /* ignore */
  }
}
