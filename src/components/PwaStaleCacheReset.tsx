"use client";

import { useEffect } from "react";

/**
 * Na tela de login, remove SW/cache PWA antigo que pode servir HTML no lugar de .js (swe-worker).
 */
export function PwaStaleCacheReset() {
  useEffect(() => {
    void (async () => {
      if (typeof window === "undefined") return;
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return null;
}
