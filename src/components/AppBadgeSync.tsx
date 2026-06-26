"use client";

import { useEffect } from "react";

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Mantém o contador no ícone do app (Badging API) em sincronia com os não lidos. */
export function AppBadgeSync({ count }: { count: number }) {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as NavigatorWithBadge;
    if (!nav.setAppBadge) return;
    if (count > 0) {
      void nav.setAppBadge(count).catch(() => {});
    } else if (nav.clearAppBadge) {
      void nav.clearAppBadge().catch(() => {});
    }
  }, [count]);

  return null;
}
