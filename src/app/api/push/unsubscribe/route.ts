import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let endpoint: string | undefined;
  try {
    const body = (await request.json()) as { endpoint?: string };
    endpoint = body?.endpoint;
  } catch {
    endpoint = undefined;
  }

  if (!endpoint) {
    return NextResponse.json({ error: "missing_endpoint" }, { status: 400 });
  }

  const sql = getSql();
  await sql`delete from push_subscriptions where user_id = ${userId} and endpoint = ${endpoint}`;

  return NextResponse.json({ ok: true });
}
