import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingSub = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { subscription?: IncomingSub } & IncomingSub;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const sub: IncomingSub = body?.subscription ?? body;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;
  const sql = getSql();
  await sql`
    insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (${userId}, ${endpoint}, ${p256dh}, ${auth}, ${userAgent})
    on conflict (endpoint) do update set
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      last_used_at = now()
  `;

  return NextResponse.json({ ok: true });
}
