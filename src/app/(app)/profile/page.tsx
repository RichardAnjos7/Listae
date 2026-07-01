import { AdminUsersManager } from "@/components/settings/AdminUsersManager";
import { InstallAppButton } from "@/components/settings/InstallAppButton";
import { NotificationsCard } from "@/components/settings/NotificationsCard";
import { ProfileHeader } from "@/components/settings/ProfileHeader";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { getAdminUsers } from "@/lib/actions/admins";
import { signOut } from "@/lib/actions/auth";
import { getProfile } from "@/lib/actions/profile";
import { getSessionUserId } from "@/lib/auth/session";
import { isSuperDev } from "@/lib/auth/super-dev";
import { getNotificationContext } from "@/lib/notifications/preferences";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ admin_promoted?: string; admin_demoted?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { admin_promoted, admin_demoted } = await searchParams;
  const [profile, notificationCtx, canManage] = await Promise.all([
    getProfile(userId),
    getNotificationContext(userId),
    isSuperDev(userId),
  ]);
  const admins = canManage ? await getAdminUsers() : [];

  return (
    <div className="space-y-6 pb-4">
      <ProfileHeader
        name={profile?.name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        city={profile?.city ?? null}
        neighborhood={profile?.neighborhood ?? null}
      />

      {(admin_promoted || admin_demoted) && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-3 py-2">
          {admin_promoted ? "Usuário promovido a administrador." : "Privilégios de admin removidos."}
        </p>
      )}

      {canManage && (
        <section className="space-y-3">
          <AdminUsersManager admins={admins} currentUserId={userId} />
        </section>
      )}

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
