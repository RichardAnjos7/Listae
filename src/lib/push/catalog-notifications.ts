import { getSuperDevUserIds } from "@/lib/auth/super-dev";
import { dispatchPush } from "@/lib/notifications/dispatch";
import { isPushConfigured } from "@/lib/push/web-push";

function formatProductLabel(name: string, brand: string | null): string {
  return brand ? `${name} (${brand})` : name;
}

/** Avisa admins (super_dev) sobre nova sugestão no catálogo. */
export async function notifyAdminsNewCatalogSubmission(input: {
  submissionId: string;
  name: string;
  brand: string | null;
  submitterUsername: string | null;
}): Promise<void> {
  if (!isPushConfigured()) return;

  const adminIds = await getSuperDevUserIds();
  if (adminIds.length === 0) return;

  const who = input.submitterUsername ? `@${input.submitterUsername}` : "Um usuário";
  const product = formatProductLabel(input.name, input.brand);

  await Promise.all(
    adminIds.map((userId) =>
      dispatchPush({
        userId,
        type: "catalog_moderation",
        payload: {
          title: "Nova sugestão no catálogo",
          body: `${who} sugeriu ${product}`,
          url: "/products",
          tag: `catalog-submission-${input.submissionId}`,
        },
      })
    )
  );
}

/** Avisa o autor que a sugestão foi aprovada. */
export async function notifySubmitterCatalogApproved(input: {
  userId: string;
  name: string;
  brand: string | null;
  submissionId: string;
}): Promise<void> {
  if (!isPushConfigured()) return;

  const product = formatProductLabel(input.name, input.brand);

  await dispatchPush({
    userId: input.userId,
    type: "catalog_review",
    payload: {
      title: "Produto aprovado no catálogo",
      body: `${product} já está disponível para todos.`,
      url: "/products",
      tag: `catalog-approved-${input.submissionId}`,
    },
  });
}

/** Avisa o autor que a sugestão foi rejeitada. */
export async function notifySubmitterCatalogRejected(input: {
  userId: string;
  name: string;
  brand: string | null;
  submissionId: string;
  reason: string | null;
}): Promise<void> {
  if (!isPushConfigured()) return;

  const product = formatProductLabel(input.name, input.brand);
  const reasonSuffix = input.reason ? ` Motivo: ${input.reason}` : "";

  await dispatchPush({
    userId: input.userId,
    type: "catalog_review",
    payload: {
      title: "Sugestão não publicada",
      body: `${product} não foi incluído no catálogo.${reasonSuffix}`,
      url: "/products",
      tag: `catalog-rejected-${input.submissionId}`,
    },
  });
}
