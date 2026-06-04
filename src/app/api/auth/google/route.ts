import { buildGoogleAuthUrl, isGoogleAuthConfigured } from "@/lib/auth/google";
import { OAUTH_NEXT_COOKIE, OAUTH_ORIGIN_COOKIE } from "@/lib/auth/oauth-constants";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", request.url)
    );
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_NEXT_COOKIE, safeNext, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const origin = request.nextUrl.origin;
  cookieStore.set(OAUTH_ORIGIN_COOKIE, origin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const url = buildGoogleAuthUrl(origin);
  return NextResponse.redirect(url);
}
