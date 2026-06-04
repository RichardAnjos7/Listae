import { readEnv } from "@/lib/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export type GoogleUserInfo = {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
};

function getGoogleClientId() {
  return readEnv("GOOGLE_CLIENT_ID");
}

function getGoogleClientSecret() {
  return readEnv("GOOGLE_CLIENT_SECRET");
}

export function isGoogleAuthConfigured() {
  try {
    getGoogleClientId();
    getGoogleClientSecret();
    return true;
  } catch {
    return false;
  }
}

export function getOAuthRedirectUri(origin: string) {
  const normalized = origin.replace(/\/$/, "");
  // Google exige match exato: unificar 127.0.0.1 → localhost em dev
  if (normalized.includes("127.0.0.1")) {
    return normalized.replace("127.0.0.1", "localhost") + "/api/auth/google/callback";
  }
  return `${normalized}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(origin: string) {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getOAuthRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

function parseGoogleTokenError(body: string, origin: string): string {
  try {
    const json = JSON.parse(body) as { error?: string; error_description?: string };
    if (json.error === "redirect_uri_mismatch") {
      return `URI de redirecionamento incorreta. Cadastre no Google Cloud: ${getOAuthRedirectUri(origin)}`;
    }
    if (json.error === "invalid_client") {
      const hint = json.error_description?.toLowerCase().includes("secret")
        ? "O Client Secret está incorreto. No Google Cloud → Credenciais, gere um secret novo e atualize GOOGLE_CLIENT_SECRET no .env.local."
        : "Client ID ou Client Secret inválidos. Confira se pertencem ao mesmo cliente OAuth (tipo Aplicativo da Web).";
      return hint;
    }
    if (json.error === "invalid_grant") {
      return "Código expirado ou já usado. Tente entrar com Google novamente.";
    }
    if (json.error_description) return json.error_description;
    if (json.error) return json.error;
  } catch {
    /* ignore */
  }
  return "Falha ao trocar código do Google.";
}

export async function exchangeCodeForGoogleUser(
  code: string,
  origin: string
): Promise<GoogleUserInfo> {
  const redirectUri = getOAuthRedirectUri(origin);

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenBody = await tokenRes.text();

  if (!tokenRes.ok) {
    if (process.env.NODE_ENV === "development") {
      console.error("[google oauth] token error:", tokenBody, "redirect_uri:", redirectUri);
    }
    throw new Error(parseGoogleTokenError(tokenBody, origin));
  }

  const tokenData = JSON.parse(tokenBody) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error("Token do Google ausente.");
  }

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error("Falha ao obter perfil do Google.");
  }

  const user = (await userRes.json()) as GoogleUserInfo;
  if (!user.id || !user.email) {
    throw new Error("Perfil do Google incompleto.");
  }
  if (user.verified_email === false) {
    throw new Error("E-mail do Google não verificado.");
  }

  return user;
}
