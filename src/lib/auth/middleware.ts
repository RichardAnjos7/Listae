import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieName } from "@/lib/auth/session";

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  const path = request.nextUrl.pathname;
  const isPublicRoute =
    path.startsWith("/login") ||
    path.startsWith("/lists/join/") ||
    path.startsWith("/api/");
  const isPublicAsset =
    path.startsWith("/_next") ||
    path.startsWith("/icon") ||
    path === "/manifest.json" ||
    path.endsWith(".png") ||
    path.endsWith(".svg") ||
    path.endsWith(".ico") ||
    path.endsWith("sw.js") ||
    path.startsWith("/workbox-");

  if (!userId && !isPublicRoute && !isPublicAsset) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (userId && path.startsWith("/login")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.delete("next");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({ request });
}
