import {
  fetchCommunityInsights,
  normalizeSinceParam,
} from "@/lib/prices/community-insights";
import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const since = normalizeSinceParam(searchParams.get("since"));

  const sql = getSql();
  const profileRows = await sql`
    select city from profiles where id = ${userId} limit 1
  `;
  const city = (profileRows[0]?.city as string | null) ?? null;

  try {
    const data = await fetchCommunityInsights(city, since);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar insights";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
