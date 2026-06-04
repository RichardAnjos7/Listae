import { getSessionUserId } from "@/lib/auth/session";
import { fetchListPresence, upsertListPresence } from "@/lib/list/presence-schema";
import { userCanAccessList } from "@/lib/db/access";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: listId } = await context.params;
    if (!(await userCanAccessList(listId, userId))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const rows = await fetchListPresence(listId);

    return NextResponse.json({
      online: rows.map((r) => ({
        userId: r.user_id as string,
        name: r.user_name as string,
      })),
    });
  } catch (err) {
    console.error("[presence GET]", err);
    return NextResponse.json({ error: "Erro ao buscar presença" }, { status: 500 });
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: listId } = await context.params;
    if (!(await userCanAccessList(listId, userId))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const sql = getSql();
    const profile = await sql`select name from profiles where id = ${userId} limit 1`;
    const name = (profile[0]?.name as string) ?? "Usuário";

    await upsertListPresence(listId, userId, name);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[presence POST]", err);
    return NextResponse.json({ error: "Erro ao registrar presença" }, { status: 500 });
  }
}
