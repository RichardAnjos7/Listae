import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { PushNotificationsToggle } from "@/components/settings/PushNotificationsToggle";
import { getProfile, updateProfile } from "@/lib/actions/profile";
import { getSessionUserId } from "@/lib/auth/session";
import { getNotificationContext } from "@/lib/notifications/preferences";
import Link from "next/link";
import { MapPin, User } from "lucide-react";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { saved } = await searchParams;
  const [profile, notificationCtx] = await Promise.all([
    getProfile(userId),
    getNotificationContext(userId),
  ]);

  async function saveAction(formData: FormData) {
    "use server";
    await updateProfile(formData);
    const { redirect } = await import("next/navigation");
    redirect("/profile?saved=1");
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-600" />
          Perfil
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Cidade e bairro filtram preços compartilhados e comparação de cesta.
        </p>
      </div>

      {saved === "1" && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Perfil salvo com sucesso.
        </div>
      )}

      {!profile?.city && (
        <div className="rounded-xl border border-amber-300/70 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <MapPin className="h-3.5 w-3.5 inline mr-1" />
          Defina sua cidade para ver preços relevantes na aba{" "}
          <Link href="/prices" className="font-semibold underline">
            Preços
          </Link>
          .
        </div>
      )}

      <form
        action={saveAction}
        className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
      >
        <div>
          <label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={profile?.name ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="city" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            placeholder="Ex.: Manaus"
            defaultValue={profile?.city ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="neighborhood" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Bairro (opcional)
          </label>
          <input
            id="neighborhood"
            name="neighborhood"
            placeholder="Ex.: Adrianópolis"
            defaultValue={profile?.neighborhood ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm hover:bg-emerald-700"
        >
          Salvar
        </button>
      </form>

      <PushNotificationsToggle />

      <NotificationPreferences
        initial={notificationCtx.prefs}
        initialQuiet={notificationCtx.quiet}
      />

      <p className="text-xs text-slate-500 text-center">
        <Link href="/" className="text-emerald-600 font-medium">
          Voltar ao início
        </Link>
      </p>
    </div>
  );
}
