import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }
  return NextResponse.json({ key });
}
