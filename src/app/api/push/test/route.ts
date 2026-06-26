import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { isPushConfigured, sendPushToUser } from "@/lib/push/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }

  const sent = await sendPushToUser(userId, {
    title: "Listaê",
    body: "Notificações ativadas! Você receberá alertas de preço por aqui.",
    url: "/alerts",
    tag: "test",
    badge: 1,
  });

  return NextResponse.json({ ok: true, sent });
}
