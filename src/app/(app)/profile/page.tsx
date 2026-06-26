import { InstallAppButton } from "@/components/settings/InstallAppButton";
import { NotificationsCard } from "@/components/settings/NotificationsCard";
import { ProfileHeader } from "@/components/settings/ProfileHeader";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { signOut } from "@/lib/actions/auth";
import { getProfile } from "@/lib/actions/profile";
import { getSessionUserId } from "@/lib/auth/session";
import { getNotificationContext } from "@/lib/notifications/preferences";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const [profile, notificationCtx] = await Promise.all([
    getProfile(userId),
    getNotificationContext(userId),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <ProfileHeader
        name={profile?.name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        city={profile?.city ?? null}
        neighborhood={profile?.neighborhood ?? null}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Aparência</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escolha o tema do aplicativo.
          </p>
        </div>

        <ThemeToggle />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notificações</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controle o que e quando você recebe alertas.
          </p>
        </div>

        <NotificationsCard
          initial={notificationCtx.prefs}
          initialQuiet={notificationCtx.quiet}
        />
      </section>

      <InstallAppButton />

      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center">
        <Link href="/" className="text-emerald-600 font-medium">
          Voltar ao início
        </Link>
      </p>
    </div>
  );
}
