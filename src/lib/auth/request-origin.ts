import type { NextRequest } from "next/server";

/** URL pública canônica do app (evita redirect_uri errado atrás de proxy). */
export function getAppOriginFromEnv(): string | null {
  const raw = process.env.APP_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Origem usada no OAuth Google. Prioridade: APP_URL → headers de proxy → request.
 */
export function getOAuthOrigin(request: NextRequest): string {
  const fromEnv = getAppOriginFromEnv();
  if (fromEnv) return fromEnv;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedHost) {
    const proto = forwardedProto === "http" ? "http" : "https";
    return `${proto}://${forwardedHost.split(",")[0].trim()}`;
  }

  return request.nextUrl.origin;
}
