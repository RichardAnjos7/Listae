import { getSql } from "@/lib/db";

export type RecordObservationInput = {
  productId: string;
  unitPrice: number;
  quantity: number;
  userId: string;
  listId?: string | null;
  supermarketId?: string | null;
  storeLocationId?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  source: "list_complete" | "manual" | "ocr";
};

export async function recordPriceObservation(input: RecordObservationInput): Promise<string> {
  const sql = getSql();
  const {
    productId,
    unitPrice,
    quantity,
    userId,
    listId = null,
    supermarketId = null,
    storeLocationId = null,
    city = null,
    neighborhood = null,
    source,
  } = input;

  if (unitPrice <= 0) return "skipped";

  const statusRows = await sql`
    select public.classify_price_observation(
      ${productId}::uuid,
      ${unitPrice},
      ${city}
    ) as status
  `;
  const status = (statusRows[0]?.status as string) ?? "verified";

  await sql`
    insert into price_observations (
      product_id, store_location_id, supermarket_id, unit_price, quantity,
      city, neighborhood, submitted_by, list_id, status, source
    )
    values (
      ${productId},
      ${storeLocationId},
      ${supermarketId},
      ${unitPrice},
      ${quantity},
      ${city},
      ${neighborhood},
      ${userId},
      ${listId},
      ${status},
      ${source}
    )
  `;

  if (status === "verified") {
    await sql`
      select public.evaluate_price_alerts(
        ${productId}::uuid,
        ${unitPrice},
        ${city}
      )
    `;
  }

  return status;
}
