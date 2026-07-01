import { AppBadgeSync } from "@/components/AppBadgeSync";
import { OfflineBanner } from "@/components/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { signOut } from "@/lib/actions/auth";
import { getProfile } from "@/lib/actions/profile";
import { getSessionUserId } from "@/lib/auth/session";
import { getUnreadInboxCount } from "@/lib/notifications/inbox";
import { Bell, LogOut, User } from "lucide-react";
import Link from "next/link";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const hasDbEnv = Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
  const userId = hasDbEnv ? await getSessionUserId() : null;
  let alertBadge = 0;
  let avatarUrl: string | null = null;
  if (userId && hasDbEnv) {
    const [count, profile] = await Promise.all([
      getUnreadInboxCount(userId),
      getProfile(userId),
    ]);
    alertBadge = count;
    avatarUrl = profile?.avatar_url ?? null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <AppBadgeSync count={alertBadge} />
      <OfflineBanner />
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Listaê</span>
        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          {userId && (
            <>
            <Link
              href="/alerts"
              aria-label="Notificações"
              className="relative flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <Bell className="h-4 w-4" />
              {alertBadge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center px-0.5">
                  {alertBadge > 9 ? "9+" : alertBadge}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              aria-label="Perfil"
              className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Perfil"
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sair"
                className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
            </>
          )}
        </div>
      </header>
      <main className="app-main flex-1 max-w-lg mx-auto w-full px-3 pt-3">
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
