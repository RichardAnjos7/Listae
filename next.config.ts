import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Em dev o PWA fica desativado por padrão (evita cache atrapalhar o HMR).
  // Para testar push no localhost, defina NEXT_PUBLIC_ENABLE_PWA_DEV=true no .env.local.
  disable:
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_PWA_DEV !== "true",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    navigateFallbackDenylist: [/^\/api\//, /^\/login/],
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) =>
          url.pathname.startsWith("/swe-worker") ||
          url.pathname === "/sw.js" ||
          url.pathname.startsWith("/workbox-"),
        handler: "NetworkOnly",
        method: "GET",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/swe-worker-:hash.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/worker-:hash.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/workbox-:hash.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default withPWA(nextConfig);
