import { getSessionUserId } from "@/lib/auth/session";
import { userCanAccessList } from "@/lib/db/access";
import { fetchListItems } from "@/lib/list/queries";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id: listId } = await context.params;
  if (!(await userCanAccessList(listId, userId))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const items = await fetchListItems(listId);
  return NextResponse.json({ items });
}
