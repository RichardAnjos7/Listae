"use client";

import { useCallback, useState } from "react";
import { PushNotificationsToggle, type PushState } from "./PushNotificationsToggle";
import { NotificationPreferences } from "./NotificationPreferences";
import type {
  NotificationPreferences as Prefs,
  QuietHours,
} from "@/lib/notifications/preferences";

export function NotificationsCard({
  initial,
  initialQuiet,
}: {
  initial: Prefs;
  initialQuiet: QuietHours;
}) {
  const [pushState, setPushState] = useState<PushState>("loading");

  const handleStateChange = useCallback((state: PushState) => {
    setPushState(state);
  }, []);

  const pushActive = pushState === "subscribed";

  return (
    <div className="space-y-4">
      <PushNotificationsToggle onStateChange={handleStateChange} />
      <NotificationPreferences
        initial={initial}
        initialQuiet={initialQuiet}
        pushActive={pushActive}
      />
    </div>
  );
}
