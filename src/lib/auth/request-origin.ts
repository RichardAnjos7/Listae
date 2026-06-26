import type { NextRequest } from "next/server";

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

/** URL pública canônica do app (evita redirect_uri errado atrás de proxy). */
export function getAppOriginFromEnv(): string | null {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.RENDER_EXTERNAL_URL,
  ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const value = normalizeOrigin(raw);
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
  }

  return null;
}

function originFromHostHeader(request: NextRequest): string | null {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.trim();
  if (!host) return null;

  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    (request.nextUrl.protocol === "http:" ? "http" : "https");

  return `${proto}://${host}`;
}

/**
 * Origem usada no OAuth Google. Prioridade: APP_URL → Host real → request.
 */
export function getOAuthOrigin(request: NextRequest): string {
  const fromEnv = getAppOriginFromEnv();
  if (fromEnv) return fromEnv;

  const fromHost = originFromHostHeader(request);
  if (fromHost) return fromHost;

  return request.nextUrl.origin;
}

/** URI exata para cadastrar no Google Cloud (documentação / debug). */
export function getCanonicalOAuthRedirectUri(): string {
  const origin = getAppOriginFromEnv() ?? "https://www.listae.anjostecnologia.com.br";
  return `${normalizeOrigin(origin)}/api/auth/google/callback`;
}
