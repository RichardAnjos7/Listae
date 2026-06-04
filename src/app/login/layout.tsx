import { PwaStaleCacheReset } from "@/components/PwaStaleCacheReset";
import { Suspense } from "react";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaStaleCacheReset />
      <Suspense fallback={<LoginFallback />}>{children}</Suspense>
    </>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <p className="text-sm text-slate-500">Carregando…</p>
    </div>
  );
}
