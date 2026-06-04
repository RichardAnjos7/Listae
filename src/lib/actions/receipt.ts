"use server";

import { requireUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/actions/profile";
import { searchCatalogProducts } from "@/lib/actions/products";
import { recordPriceObservation } from "@/lib/prices/record-observation";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";

const shareCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

export type ReceiptLineMatch = {
  rawName: string;
  quantity: number;
  unitPrice: number;
  productId: string | null;
  productName: string | null;
  score: number;
};

export async function matchReceiptLines(
  lines: { rawName: string; quantity: number; unitPrice: number }[]
): Promise<ReceiptLineMatch[]> {
  await requireUserId();
  const results: ReceiptLineMatch[] = [];

  for (const line of lines) {
    const q = line.rawName.slice(0, 60);
    const hits = await searchCatalogProducts(q);
    const top = hits[0];
    const normRaw = q.toLowerCase().replace(/[^a-z0-9à-ú\s]/gi, "");
    const normName = top?.name.toLowerCase().replace(/[^a-z0-9à-ú\s]/gi, "") ?? "";
    const score =
      top && normRaw.length > 2
        ? normName.includes(normRaw.slice(0, 6)) || normRaw.includes(normName.slice(0, 6))
          ? 0.85
          : hits.length > 0
            ? 0.55
            : 0
        : 0;
    results.push({
      rawName: line.rawName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      productId: score >= 0.55 ? top?.id ?? null : null,
      productName: top?.name ?? null,
      score,
    });
  }

  return results;
}

export type ConfirmReceiptLine = {
  productId: string;
  rawName: string;
  quantity: number;
  unitPrice: number;
};

export async function confirmReceiptImport(input: {
  supermarketId?: string | null;
  lines: ConfirmReceiptLine[];
}) {
  const userId = await requireUserId();
  const sql = getSql();

  const validLines = input.lines.filter((l) => l.productId && l.unitPrice > 0);
  if (validLines.length === 0) throw new Error("Nenhum item válido para importar");

  const profile = await getProfile(userId);
  let supermarketId = input.supermarketId ?? null;
  let supermarketName: string | null = null;
  let storeLocationId: string | null = null;
  let smCity: string | null = null;
  let smNeighborhood: string | null = null;

  if (supermarketId) {
    const smRows = await sql`
      select name, store_location_id, city, neighborhood
      from supermarkets
      where id = ${supermarketId} and user_id = ${userId}
      limit 1
    `;
    if (smRows[0]) {
      supermarketName = smRows[0].name as string;
      storeLocationId = smRows[0].store_location_id as string | null;
      smCity = smRows[0].city as string | null;
      smNeighborhood = smRows[0].neighborhood as string | null;
    }
  }

  const city = smCity ?? profile?.city ?? null;
  const neighborhood = smNeighborhood ?? profile?.neighborhood ?? null;
  const now = new Date().toISOString();
  const listName = `Nota fiscal ${new Date().toLocaleDateString("pt-BR")}`;

  const listRows = await sql`
    insert into shopping_lists (name, owner_id, supermarket_id, share_code, status, completed_at)
    values (
      ${listName},
      ${userId},
      ${supermarketId},
      ${shareCode()},
      'completed',
      ${now}
    )
    returning id
  `;
  const listId = listRows[0].id as string;

  let listTotal = 0;

  for (const line of validLines) {
    const qty = line.quantity > 0 ? line.quantity : 1;
    const lineTotal = Math.round(qty * line.unitPrice * 100) / 100;
    listTotal += lineTotal;

    const productRows = await sql`
      select name, brand, unit, package_size from products where id = ${line.productId} limit 1
    `;
    const p = productRows[0];
    if (!p) continue;

    await sql`
      insert into list_items (list_id, product_id, quantity, unit_price, added_by, checked)
      values (${listId}, ${line.productId}, ${qty}, ${line.unitPrice}, ${userId}, true)
    `;

    await sql`
      insert into price_history (product_id, supermarket_id, price, list_id)
      values (${line.productId}, ${supermarketId}, ${line.unitPrice}, ${listId})
    `;

    await recordPriceObservation({
      productId: line.productId,
      unitPrice: line.unitPrice,
      quantity: qty,
      userId,
      listId,
      supermarketId,
      storeLocationId,
      city,
      neighborhood,
      source: "ocr",
    });
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
  `;

  const snapshotRows = await sql`
    select id from purchase_snapshots where list_id = ${listId} limit 1
  `;
  const snapshotId = snapshotRows[0]?.id as string | undefined;

  if (snapshotId) {
    for (const line of validLines) {
      const qty = line.quantity > 0 ? line.quantity : 1;
      const productRows = await sql`
        select name, brand, unit, package_size from products where id = ${line.productId} limit 1
      `;
      const p = productRows[0];
      if (!p) continue;
      const lineTotal = Math.round(qty * line.unitPrice * 100) / 100;
      await sql`
        insert into purchase_snapshot_items (
          snapshot_id, product_id, product_name, brand, unit, package_size,
          quantity, unit_price, line_total
        )
        values (
          ${snapshotId},
          ${line.productId},
          ${p.name},
          ${p.brand},
          ${p.unit},
          ${p.package_size},
          ${qty},
          ${line.unitPrice},
          ${lineTotal}
        )
      `;
    }
  }

  revalidatePath("/history");
  revalidatePath("/");
  revalidatePath("/prices");
  revalidatePath("/alerts");

  return { listId, itemCount: validLines.length, listTotal };
}
