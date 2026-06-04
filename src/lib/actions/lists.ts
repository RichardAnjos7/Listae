"use server";

import { requireUserId } from "@/lib/auth/session";
import { requireListAccess } from "@/lib/db/access";
import { getSql } from "@/lib/db";
import { recordPriceObservation } from "@/lib/prices/record-observation";
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
    select sl.supermarket_id, sl.owner_id, sm.name as supermarket_name,
           sm.store_location_id, sm.city as sm_city, sm.neighborhood as sm_neighborhood
    from shopping_lists sl
    left join supermarkets sm on sm.id = sl.supermarket_id
    where sl.id = ${listId}
    limit 1
  `;
  const listRow = listRows[0];
  const supermarketId = (listRow?.supermarket_id as string | null) ?? null;
  const supermarketName = (listRow?.supermarket_name as string | null) ?? null;
  const storeLocationId = (listRow?.store_location_id as string | null) ?? null;
  const smCity = (listRow?.sm_city as string | null) ?? null;
  const smNeighborhood = (listRow?.sm_neighborhood as string | null) ?? null;

  const profileRows = await sql`
    select city, neighborhood from profiles where id = ${userId} limit 1
  `;
  const city = smCity ?? (profileRows[0]?.city as string | null) ?? null;
  const neighborhood = smNeighborhood ?? (profileRows[0]?.neighborhood as string | null) ?? null;

  const items = await sql`
    select
      li.id as list_item_id,
      li.product_id,
      li.unit_price,
      li.quantity,
      p.name as product_name,
      p.brand,
      p.unit,
      p.package_size
    from list_items li
    join products p on p.id = li.product_id
    where li.list_id = ${listId}
  `;

  const now = new Date().toISOString();
  await sql`
    update shopping_lists
    set status = 'completed', completed_at = ${now}
    where id = ${listId}
  `;

  let listTotal = 0;
  for (const item of items) {
    const unitPrice = item.unit_price != null ? Number(item.unit_price) : 0;
    const qty = Number(item.quantity);
    if (unitPrice > 0) {
      listTotal += qty * unitPrice;
    }
  }

  await sql`
    insert into purchase_snapshots (
      list_id, owner_id, supermarket_id, supermarket_name,
      store_location_id, city, neighborhood, completed_at, list_total
    )
    values (
      ${listId},
      ${userId},
      ${supermarketId},
      ${supermarketName},
      ${storeLocationId},
      ${city},
      ${neighborhood},
      ${now},
      ${listTotal}
    )
    on conflict (list_id) do nothing
  `;

  const snapshotRows = await sql`
    select id from purchase_snapshots where list_id = ${listId} limit 1
  `;
  const snapshotId = snapshotRows[0]?.id as string | undefined;

  for (const item of items) {
    const unitPrice = item.unit_price != null ? Number(item.unit_price) : 0;
    const qty = Number(item.quantity);
    if (unitPrice <= 0) continue;

    const lineTotal = Math.round(qty * unitPrice * 100) / 100;

    if (snapshotId) {
      await sql`
        insert into purchase_snapshot_items (
          snapshot_id, product_id, product_name, brand, unit, package_size,
          quantity, unit_price, line_total
        )
        values (
          ${snapshotId},
          ${item.product_id},
          ${item.product_name},
          ${item.brand},
          ${item.unit},
          ${item.package_size},
          ${qty},
          ${unitPrice},
          ${lineTotal}
        )
      `;
    }

    await sql`
      insert into price_history (product_id, supermarket_id, price, list_id)
      values (${item.product_id}, ${supermarketId}, ${unitPrice}, ${listId})
    `;

    await recordPriceObservation({
      productId: item.product_id as string,
      unitPrice,
      quantity: qty,
      userId,
      listId,
      supermarketId,
      storeLocationId,
      city,
      neighborhood,
      source: "list_complete",
    });
  }

  revalidatePath("/lists");
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/prices");
  revalidatePath("/alerts");
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
