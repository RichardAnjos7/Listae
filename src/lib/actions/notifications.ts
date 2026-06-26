"use server";

import { requireUserId } from "@/lib/auth/session";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  updateQuietHours,
  type NotificationPreferences,
  type NotificationType,
  type QuietHours,
} from "@/lib/notifications/preferences";

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
