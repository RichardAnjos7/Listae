import { OfflineBanner } from "@/components/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { signOut } from "@/lib/actions/auth";
import { getSessionUserId } from "@/lib/auth/session";
import { LogOut } from "lucide-react";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const hasDbEnv = Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
  const userId = hasDbEnv ? await getSessionUserId() : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
      <OfflineBanner />
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">iList</span>
        {userId && (
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        )}
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-3 pt-3">
        {!hasDbEnv && (
          <div className="mb-3 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Configure <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">DATABASE_URL</code> e{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">AUTH_SECRET</code> no{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">.env.local</code>.
          </div>
        )}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
