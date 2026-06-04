import { getSessionUserId } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { fetchListItemsVersion } from "@/lib/list/queries";
import { fetchListPresence, upsertListPresence } from "@/lib/list/presence-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const POLL_MS = 1500;
const HEARTBEAT_MS = 15000;

export async function GET(request: Request, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response("Não autenticado", { status: 401 });
  }

  const { id: listId } = await context.params;
  const sql = getSql();

  const access = await sql`
    select public.user_can_access_list(${listId}::uuid, ${userId}::uuid) as ok
  `;
  if (!access[0]?.ok) {
    return new Response("Sem permissão", { status: 403 });
  }

  let lastVersion = await fetchListItemsVersion(listId);
  let lastPresenceKey = "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: "connected", version: lastVersion });

      const tick = async () => {
        try {
          const version = await fetchListItemsVersion(listId);
          if (version !== lastVersion) {
            lastVersion = version;
            send({ type: "items_changed", version });
          }

          const presenceRows = await fetchListPresence(listId);
          const presenceKey = presenceRows
            .map((r) => `${r.user_id}:${r.last_seen_at}`)
            .join("|");
          if (presenceKey !== lastPresenceKey) {
            lastPresenceKey = presenceKey;
            send({
              type: "presence",
              online: presenceRows.map((r) => ({
                userId: r.user_id as string,
                name: r.user_name as string,
              })),
            });
          }
        } catch {
          send({ type: "error" });
        }
      };

      void tick();
      const pollId = setInterval(() => void tick(), POLL_MS);
      const heartbeatId = setInterval(async () => {
        try {
          const profile = await sql`
            select name from profiles where id = ${userId} limit 1
          `;
          const name = (profile[0]?.name as string) ?? "Usuário";
          await upsertListPresence(listId, userId, name);
        } catch {
          /* ignore */
        }
      }, HEARTBEAT_MS);

      void (async () => {
        try {
          const profile = await sql`
            select name from profiles where id = ${userId} limit 1
          `;
          const name = (profile[0]?.name as string) ?? "Usuário";
          await upsertListPresence(listId, userId, name);
        } catch {
          /* ignore */
        }
      })();

      request.signal.addEventListener("abort", () => {
        clearInterval(pollId);
        clearInterval(heartbeatId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
