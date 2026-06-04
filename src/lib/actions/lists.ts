"use server";

import { requireUserId } from "@/lib/auth/session";
import { requireListAccess } from "@/lib/db/access";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";

const shareCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

export async function createList(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();

  const name = String(formData.get("name") ?? "").trim() || "Nova lista";
  const supermarketId = String(formData.get("supermarket_id") ?? "").trim() || null;

  const rows = await sql`
    insert into shopping_lists (name, owner_id, supermarket_id, share_code)
    values (
      ${name},
      ${userId},
      ${supermarketId},
      ${shareCode()}
    )
    returning id
  `;

  revalidatePath("/lists");
  return rows[0].id as string;
}

export async function ensureShareCode(listId: string) {
  const userId = await requireUserId();
  await requireListAccess(listId, userId);
  const sql = getSql();

  const rows = await sql`
    select share_code from shopping_lists where id = ${listId} limit 1
  `;
  if (rows[0]?.share_code) return rows[0].share_code as string;

  const code = shareCode();
  await sql`update shopping_lists set share_code = ${code} where id = ${listId}`;
  revalidatePath(`/lists/${listId}`);
  return code;
}

export async function addListItem(listId: string, productId: string, quantity: number, unitPrice: number | null) {
  const userId = await requireUserId();
  await requireListAccess(listId, userId);
  const sql = getSql();

  await sql`
    insert into list_items (list_id, product_id, quantity, unit_price, added_by)
    values (${listId}, ${productId}, ${quantity}, ${unitPrice}, ${userId})
  `;
  revalidatePath(`/lists/${listId}`);
}

export async function updateListItem(
  itemId: string,
  listId: string,
  patch: { quantity?: number; unit_price?: number | null; checked?: boolean }
) {
  const userId = await requireUserId();
  await requireListAccess(listId, userId);
  const sql = getSql();

  if (patch.quantity !== undefined) {
    await sql`update list_items set quantity = ${patch.quantity} where id = ${itemId}`;
  }
  if (patch.unit_price !== undefined) {
    await sql`update list_items set unit_price = ${patch.unit_price} where id = ${itemId}`;
  }
  if (patch.checked === true) {
    await sql`update list_items set checked = true, checked_by = ${userId} where id = ${itemId}`;
  }
  if (patch.checked === false) {
    await sql`update list_items set checked = false, checked_by = null where id = ${itemId}`;
  }

  revalidatePath(`/lists/${listId}`);
}

export async function removeListItem(itemId: string, listId: string) {
  const userId = await requireUserId();
  await requireListAccess(listId, userId);
  const sql = getSql();
  await sql`delete from list_items where id = ${itemId}`;
  revalidatePath(`/lists/${listId}`);
}

export async function completeList(listId: string) {
  const userId = await requireUserId();
  await requireListAccess(listId, userId);
  const sql = getSql();

  const listRows = await sql`
    select supermarket_id from shopping_lists where id = ${listId} limit 1
  `;
  const supermarketId = listRows[0]?.supermarket_id as string | null;

  const items = await sql`
    select product_id, unit_price, quantity
    from list_items
    where list_id = ${listId}
  `;

  const now = new Date().toISOString();
  await sql`
    update shopping_lists
    set status = 'completed', completed_at = ${now}
    where id = ${listId}
  `;

  for (const item of items) {
    const price = item.unit_price != null ? Number(item.unit_price) : 0;
    if (price <= 0) continue;
    await sql`
      insert into price_history (product_id, supermarket_id, price, list_id)
      values (${item.product_id}, ${supermarketId}, ${price}, ${listId})
    `;
  }

  revalidatePath("/lists");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function joinListByCodeAction(code: string) {
  const userId = await requireUserId();
  const sql = getSql();
  const rows = await sql`
    select public.join_list_by_code(${code.trim()}, ${userId}::uuid) as list_id
  `;
  revalidatePath("/lists");
  return rows[0].list_id as string;
}

export async function toggleFavoriteFromForm(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const favorited = String(formData.get("next_favorited") ?? "") === "1";
  if (!productId) throw new Error("Produto inválido");
  await toggleFavorite(productId, favorited);
}

export async function toggleFavorite(productId: string, favorited: boolean) {
  const userId = await requireUserId();
  const sql = getSql();

  if (favorited) {
    await sql`
      insert into favorite_products (user_id, product_id)
      values (${userId}, ${productId})
      on conflict do nothing
    `;
  } else {
    await sql`
      delete from favorite_products
      where user_id = ${userId} and product_id = ${productId}
    `;
  }
  revalidatePath("/products");
}

export async function searchProducts(query: string) {
  const q = query.trim();
  if (q.length < 1) return [];

  const sql = getSql();
  const pattern = `%${q}%`;
  const rows = await sql`
    select id, name, brand, unit, category_id
    from products
    where name ilike ${pattern} or brand ilike ${pattern}
    order by name
    limit 20
  `;
  return rows;
}
