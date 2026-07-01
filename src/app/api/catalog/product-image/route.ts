import { getSessionUserId } from "@/lib/auth/session";
import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function blobAccess(): "public" | "private" {
  const raw = process.env.BLOB_ACCESS?.trim().toLowerCase();
  return raw === "public" ? "public" : "private";
}

function serveUrl(pathname: string, request: Request): string {
  const base = new URL(request.url);
  return `${base.origin}/api/catalog/product-image?p=${encodeURIComponent(pathname)}`;
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Upload de imagens não configurado (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 }
    );
  }

  const pathname = new URL(request.url).searchParams.get("p");
  if (!pathname || !pathname.startsWith("products/")) {
    return NextResponse.json({ error: "Imagem inválida" }, { status: 400 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result?.stream) {
      return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao carregar imagem";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Upload de imagens não configurado (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo de imagem obrigatório" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande (máx. 5 MB)" }, { status: 400 });
  }

  const type = file.type || "image/jpeg";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "Use JPG, PNG ou WebP" }, { status: 400 });
  }

  const ext = type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const pathname = `products/${userId}/${Date.now()}.${ext}`;
  const access = blobAccess();

  try {
    const blob = await put(pathname, file, {
      access,
      contentType: type,
    });

    const url = access === "private" ? serveUrl(pathname, request) : blob.url;
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no upload";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
