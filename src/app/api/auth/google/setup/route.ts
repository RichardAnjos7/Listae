import { getOAuthRedirectUri, isGoogleAuthConfigured } from "@/lib/auth/google";
import {
  getAppOriginFromEnv,
  getCanonicalOAuthRedirectUri,
  getOAuthOrigin,
} from "@/lib/auth/request-origin";
import { NextResponse, type NextRequest } from "next/server";

/** Diagnóstico público: URIs que devem estar no Google Cloud Console. */
export async function GET(request: NextRequest) {
  const origin = getOAuthOrigin(request);
  const redirectUri = getOAuthRedirectUri(origin);
  const envOrigin = getAppOriginFromEnv();

  return NextResponse.json({
    google_configured: isGoogleAuthConfigured(),
    origin_used: origin,
    redirect_uri_used: redirectUri,
    app_url_env: envOrigin,
    canonical_redirect_uri: getCanonicalOAuthRedirectUri(),
    google_console: {
      authorized_javascript_origins: [
        envOrigin ?? origin,
        origin,
      ].filter((v, i, a) => v && a.indexOf(v) === i),
      authorized_redirect_uris: [
        redirectUri,
        getCanonicalOAuthRedirectUri(),
        "http://localhost:5175/api/auth/google/callback",
      ].filter((v, i, a) => v && a.indexOf(v) === i),
    },
    checklist: [
      "Cliente OAuth tipo Aplicativo da Web",
      "redirect_uri deve ser IDÊNTICO (https, domínio, path, sem barra final)",
      "APP_URL=https://ilista.anjostecnologia.com.br no painel de deploy",
      "Se usar www, cadastre também https://www.ilista.anjostecnologia.com.br/api/auth/google/callback",
    ],
  });
}
