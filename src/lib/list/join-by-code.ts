import { getSql } from "@/lib/db";

/** Entra na lista pelo código — sem revalidatePath (pode rodar durante render/redirect). */
export async function joinListByCode(userId: string, code: string): Promise<string> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Código inválido");

  const sql = getSql();
  const rows = await sql`
    select public.join_list_by_code(${trimmed}, ${userId}::uuid) as list_id
  `;
  const listId = rows[0]?.list_id as string | undefined;
  if (!listId) throw new Error("Lista não encontrada");
  return listId;
}
