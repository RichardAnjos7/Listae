import { OfflineBanner } from "@/components/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { signOut } from "@/lib/actions/auth";
import { getSessionUserId } from "@/lib/auth/session";
import { Bell, LogOut, User } from "lucide-react";
import { getSql } from "@/lib/db";
import Link from "next/link";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const hasDbEnv = Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
  const userId = hasDbEnv ? await getSessionUserId() : null;
  let alertBadge = 0;
  if (userId && hasDbEnv) {
    try {
      const sql = getSql();
      const rows = await sql`select public.get_unread_alert_count(${userId}::uuid) as c`;
      alertBadge = Number(rows[0]?.c ?? 0);
    } catch {
      alertBadge = 0;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
      <OfflineBanner />
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">iList</span>
        {userId && (
          <div className="flex items-center gap-3">
            <Link
              href="/alerts"
              className="relative flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <Bell className="h-3.5 w-3.5" />
              Alertas
              {alertBadge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center px-0.5">
                  {alertBadge > 9 ? "9+" : alertBadge}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <User className="h-3.5 w-3.5" />
              Perfil
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </form>
          </div>
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
