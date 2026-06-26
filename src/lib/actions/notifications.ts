"use server";

import { requireUserId } from "@/lib/auth/session";
import {
  getInbox,
  markAllInboxRead,
  markInboxItemRead,
  type InboxItem,
  type InboxSource,
} from "@/lib/notifications/inbox";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  updateQuietHours,
  type NotificationPreferences,
  type NotificationType,
  type QuietHours,
} from "@/lib/notifications/preferences";
import { revalidatePath } from "next/cache";

export async function getMyNotificationPreferences(): Promise<NotificationPreferences> {
  const userId = await requireUserId();
  return getNotificationPreferences(userId);
}

export async function setNotificationPreference(
  type: NotificationType,
  enabled: boolean
): Promise<NotificationPreferences> {
  const userId = await requireUserId();
  return updateNotificationPreferences(userId, { [type]: enabled });
}

export async function setQuietHours(patch: Partial<QuietHours>): Promise<QuietHours> {
  const userId = await requireUserId();
  return updateQuietHours(userId, patch);
}

export async function getMyInbox(limit = 30): Promise<InboxItem[]> {
  const userId = await requireUserId();
  return getInbox(userId, limit);
}

export async function markInboxRead(source: InboxSource, id: string): Promise<void> {
  const userId = await requireUserId();
  await markInboxItemRead(userId, source, id);
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function markAllInboxReadAction(): Promise<void> {
  const userId = await requireUserId();
  await markAllInboxRead(userId);
  revalidatePath("/alerts");
  revalidatePath("/");
}
