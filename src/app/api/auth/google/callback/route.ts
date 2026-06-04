import { OAUTH_NEXT_COOKIE, OAUTH_ORIGIN_COOKIE } from "@/lib/auth/oauth-constants";
import { exchangeCodeForGoogleUser, isGoogleAuthConfigured } from "@/lib/auth/google";
import { findOrCreateUserFromGoogle } from "@/lib/auth/oauth-user";
import { createSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  if (!isGoogleAuthConfigured()) {
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    loginUrl.searchParams.set("error", "google_denied");
    return NextResponse.redirect(loginUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    loginUrl.searchParams.set("error", "google_missing_code");
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const next = cookieStore.get(OAUTH_NEXT_COOKIE)?.value ?? "/";
  const origin =
    cookieStore.get(OAUTH_ORIGIN_COOKIE)?.value ?? request.nextUrl.origin;
  cookieStore.delete(OAUTH_NEXT_COOKIE);
  cookieStore.delete(OAUTH_ORIGIN_COOKIE);

  try {
    const googleUser = await exchangeCodeForGoogleUser(code, origin);
    const userId = await findOrCreateUserFromGoogle(googleUser);
    await createSession(userId);

    const redirectUrl = new URL(next.startsWith("/") ? next : "/", request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao entrar com Google.";
    loginUrl.searchParams.set("error", "google_failed");
    loginUrl.searchParams.set("message", message.slice(0, 200));
    return NextResponse.redirect(loginUrl);
  }
}
