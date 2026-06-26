import { getSql } from "@/lib/db";

export type JoinResult = { listId: string; isNew: boolean };

/**
 * Entra na lista pelo código — sem revalidatePath (pode rodar durante render/redirect).
 * `isNew` indica que o usuário passou a ser colaborador agora (para notificar os demais).
 */
export async function joinListByCode(userId: string, code: string): Promise<JoinResult> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Código inválido");

  const sql = getSql();
  const listRows = await sql`
    select id, owner_id
    from shopping_lists
    where share_code = ${trimmed} and status = 'active'
    limit 1
  `;
  const row = listRows[0];
  if (!row) throw new Error("Lista não encontrada");

  const listId = row.id as string;
  const ownerId = row.owner_id as string;

  if (ownerId === userId) {
    return { listId, isNew: false };
  }

  const existing = await sql`
    select 1 from list_collaborators
    where list_id = ${listId} and user_id = ${userId}
    limit 1
  `;
  const wasMember = existing.length > 0;

  await sql`
    insert into list_collaborators (list_id, user_id, role)
    values (${listId}, ${userId}, 'editor')
    on conflict (list_id, user_id) do nothing
  `;

  return { listId, isNew: !wasMember };
}
