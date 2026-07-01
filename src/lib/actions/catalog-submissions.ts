"use server";

import { requireSuperDev } from "@/lib/auth/super-dev";
import { requireUserId } from "@/lib/auth/session";
import {
  deleteBlobPath,
  parseBlobPathname,
  promoteStagingImage,
} from "@/lib/catalog/blob-images";
import { parsePackageFromForm } from "@/lib/catalog/units";
import { getSql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CatalogSubmission = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  package_size: string | null;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  image_staging_path: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_by: string;
  submitter_username: string | null;
  unit_price: number | null;
  supermarket_id: string | null;
  supermarket_name: string | null;
  is_promotion: boolean;
  valid_until: string | null;
  created_at: string;
  reject_reason: string | null;
};

function readSubmissionForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const { unit, packageSize } = parsePackageFromForm(formData);
  const imageStagingPath = parseBlobPathname(String(formData.get("image_url") ?? ""));

  if (!name) throw new Error("Nome do produto é obrigatório");
  if (!categoryId) throw new Error("Selecione uma categoria");
  if (imageStagingPath && !imageStagingPath.startsWith("staging/")) {
    throw new Error("Foto inválida — envie novamente");
  }

  return { name, brand, unit, packageSize, categoryId, imageStagingPath };
}

function readOptionalPriceFromForm(formData: FormData) {
  const priceRaw = String(formData.get("unit_price") ?? "").trim().replace(",", ".");
  const unitPrice = priceRaw ? Number(priceRaw) : null;
  const supermarketId = String(formData.get("supermarket_id") ?? "").trim() || null;
  const isPromotion = String(formData.get("is_promotion") ?? "") === "1";
  const validUntilRaw = String(formData.get("valid_until") ?? "").trim();

  if (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    return null;
  }

  if (isPromotion && !validUntilRaw) {
    throw new Error("Informe até quando vale a promoção");
  }

  let validUntil: string | null = null;
  if (isPromotion && validUntilRaw) {
    const end = new Date(`${validUntilRaw}T23:59:59`);
    if (Number.isNaN(end.getTime())) throw new Error("Data de promoção inválida");
    validUntil = end.toISOString();
  }

  return { unitPrice, supermarketId, isPromotion, validUntil };
}

function mapSubmissionRow(r: Record<string, unknown>): CatalogSubmission {
  return {
    id: r.id as string,
    name: r.name as string,
    brand: r.brand as string | null,
    unit: r.unit as string,
    package_size: r.package_size as string | null,
    category_id: r.category_id as string | null,
    category_name: r.category_name as string | null,
    category_icon: r.category_icon as string | null,
    image_staging_path: r.image_staging_path as string | null,
    status: r.status as CatalogSubmission["status"],
    submitted_by: r.submitted_by as string,
    submitter_username: r.submitter_username as string | null,
    unit_price: r.unit_price != null ? Number(r.unit_price) : null,
    supermarket_id: r.supermarket_id as string | null,
    supermarket_name: r.supermarket_name as string | null,
    is_promotion: Boolean(r.is_promotion),
    valid_until: r.valid_until as string | null,
    created_at: r.created_at as string,
    reject_reason: r.reject_reason as string | null,
  };
}

export async function submitCatalogProduct(formData: FormData) {
  const userId = await requireUserId();
  const sql = getSql();
  const { name, brand, unit, packageSize, categoryId, imageStagingPath } =
    readSubmissionForm(formData);
  const optionalPrice = readOptionalPriceFromForm(formData);

  if (imageStagingPath) {
    const owner = imageStagingPath.split("/")[1];
    if (owner !== userId) {
      throw new Error("Foto inválida");
    }
  }

  const inserted = await sql`
    insert into product_submissions (
      name, brand, unit, package_size, category_id, image_staging_path,
      submitted_by, unit_price, supermarket_id, is_promotion, valid_until
    )
    values (
      ${name},
      ${brand},
      ${unit},
      ${packageSize},
      ${categoryId},
      ${imageStagingPath},
      ${userId},
      ${optionalPrice?.unitPrice ?? null},
      ${optionalPrice?.supermarketId ?? null},
      ${optionalPrice?.isPromotion ?? false},
      ${optionalPrice?.validUntil ?? null}
    )
    returning id
  `;

  const submissionId = inserted[0]?.id as string | undefined;

  revalidatePath("/products");

  if (submissionId) {
    const userRows = await sql`select username from users where id = ${userId} limit 1`;
    try {
      const { notifyAdminsNewCatalogSubmission } = await import("@/lib/push/catalog-notifications");
      await notifyAdminsNewCatalogSubmission({
        submissionId,
        name,
        brand,
        submitterUsername: (userRows[0]?.username as string | null) ?? null,
      });
    } catch {
      /* push é best-effort */
    }
  }
}

export async function getPendingCatalogSubmissionCount(userId: string): Promise<number> {
  const { isSuperDev } = await import("@/lib/auth/super-dev");
  if (!(await isSuperDev(userId))) return 0;

  const sql = getSql();
  const rows = await sql`
    select count(*)::int as c from product_submissions where status = 'pending'
  `;
  return Number(rows[0]?.c ?? 0);
}

export async function getPendingCatalogSubmissions(): Promise<CatalogSubmission[]> {
  await requireSuperDev();
  const sql = getSql();

  const rows = await sql`
    select
      s.id, s.name, s.brand, s.unit, s.package_size, s.category_id,
      s.image_staging_path, s.status, s.submitted_by, s.unit_price,
      s.supermarket_id, s.is_promotion, s.valid_until, s.created_at, s.reject_reason,
      c.name as category_name, c.icon as category_icon,
      u.username as submitter_username,
      sm.name as supermarket_name
    from product_submissions s
    left join categories c on c.id = s.category_id
    left join users u on u.id = s.submitted_by
    left join supermarkets sm on sm.id = s.supermarket_id
    where s.status = 'pending'
    order by s.created_at asc
    limit 50
  `;

  return rows.map((r) => mapSubmissionRow(r as Record<string, unknown>));
}

export async function getUserPendingSubmissions(userId: string): Promise<CatalogSubmission[]> {
  const sql = getSql();

  const rows = await sql`
    select
      s.id, s.name, s.brand, s.unit, s.package_size, s.category_id,
      s.image_staging_path, s.status, s.submitted_by, s.unit_price,
      s.supermarket_id, s.is_promotion, s.valid_until, s.created_at, s.reject_reason,
      c.name as category_name, c.icon as category_icon,
      u.username as submitter_username,
      sm.name as supermarket_name
    from product_submissions s
    left join categories c on c.id = s.category_id
    left join users u on u.id = s.submitted_by
    left join supermarkets sm on sm.id = s.supermarket_id
    where s.submitted_by = ${userId} and s.status = 'pending'
    order by s.created_at desc
    limit 10
  `;

  return rows.map((r) => mapSubmissionRow(r as Record<string, unknown>));
}

export async function approveCatalogSubmission(submissionId: string) {
  const adminId = await requireSuperDev();
  const sql = getSql();

  const rows = await sql`
    select *
    from product_submissions
    where id = ${submissionId} and status = 'pending'
    limit 1
  `;
  const sub = rows[0] as Record<string, unknown> | undefined;
  if (!sub) throw new Error("Submissão não encontrada ou já revisada");

  const inserted = await sql`
    insert into products (
      name, brand, unit, package_size, barcode, category_id, image_url, is_global, created_by
    )
    values (
      ${sub.name as string},
      ${sub.brand as string | null},
      ${sub.unit as string},
      ${sub.package_size as string | null},
      null,
      ${sub.category_id as string | null},
      null,
      true,
      ${sub.submitted_by as string}
    )
    returning id
  `;

  const productId = inserted[0]?.id as string;
  if (!productId) throw new Error("Falha ao publicar produto");

  let imageUrl: string | null = null;
  const stagingPath = sub.image_staging_path as string | null;
  if (stagingPath) {
    imageUrl = await promoteStagingImage(stagingPath, productId);
    if (imageUrl) {
      await sql`update products set image_url = ${imageUrl} where id = ${productId}`;
    }
  }

  const unitPrice = sub.unit_price != null ? Number(sub.unit_price) : null;
  if (unitPrice && unitPrice > 0) {
    const profileRows = await sql`
      select city, neighborhood from profiles where id = ${sub.submitted_by as string} limit 1
    `;
    const city = (profileRows[0]?.city as string | null) ?? null;
    const neighborhood = (profileRows[0]?.neighborhood as string | null) ?? null;

    const { recordPriceObservation } = await import("@/lib/prices/record-observation");
    await recordPriceObservation({
      productId,
      unitPrice,
      quantity: 1,
      userId: sub.submitted_by as string,
      supermarketId: sub.supermarket_id as string | null,
      city,
      neighborhood,
      source: "manual",
      isPromotion: Boolean(sub.is_promotion),
      validUntil: sub.valid_until as string | null,
    });
  }

  await sql`
    update product_submissions
    set
      status = 'approved',
      reviewed_by = ${adminId},
      reviewed_at = now(),
      product_id = ${productId}
    where id = ${submissionId}
  `;

  try {
    const { notifySubmitterCatalogApproved } = await import("@/lib/push/catalog-notifications");
    await notifySubmitterCatalogApproved({
      userId: sub.submitted_by as string,
      name: sub.name as string,
      brand: sub.brand as string | null,
      submissionId,
    });
  } catch {
    /* push é best-effort */
  }

  revalidatePath("/products");
  revalidatePath("/prices");
  revalidatePath("/");
}

export async function rejectCatalogSubmission(submissionId: string, reason?: string) {
  const adminId = await requireSuperDev();
  const sql = getSql();

  const rows = await sql`
    select name, brand, submitted_by, image_staging_path
    from product_submissions
    where id = ${submissionId} and status = 'pending'
    limit 1
  `;
  const sub = rows[0] as
    | {
        name: string;
        brand: string | null;
        submitted_by: string;
        image_staging_path: string | null;
      }
    | undefined;
  if (!sub) throw new Error("Submissão não encontrada ou já revisada");

  await deleteBlobPath(sub.image_staging_path);

  await sql`
    update product_submissions
    set
      status = 'rejected',
      reviewed_by = ${adminId},
      reviewed_at = now(),
      reject_reason = ${reason?.trim() || null}
    where id = ${submissionId}
  `;

  try {
    const { notifySubmitterCatalogRejected } = await import("@/lib/push/catalog-notifications");
    await notifySubmitterCatalogRejected({
      userId: sub.submitted_by,
      name: sub.name,
      brand: sub.brand,
      submissionId,
      reason: reason?.trim() || null,
    });
  } catch {
    /* push é best-effort */
  }

  revalidatePath("/products");
}

export async function approveCatalogSubmissionFromForm(formData: FormData) {
  const id = String(formData.get("submission_id") ?? "").trim();
  if (!id) throw new Error("Submissão inválida");
  await approveCatalogSubmission(id);
  const { redirect } = await import("next/navigation");
  redirect("/products?approved=1");
}

export async function rejectCatalogSubmissionFromForm(formData: FormData) {
  const id = String(formData.get("submission_id") ?? "").trim();
  const reason = String(formData.get("reject_reason") ?? "").trim();
  if (!id) throw new Error("Submissão inválida");
  await rejectCatalogSubmission(id, reason || undefined);
  const { redirect } = await import("next/navigation");
  redirect("/products?rejected=1");
}
