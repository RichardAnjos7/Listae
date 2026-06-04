import { AlertProductSearch } from "@/components/alerts/AlertProductSearch";
import {
  createPriceAlert,
  deletePriceAlert,
  getUserAlerts,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  togglePriceAlert,
} from "@/lib/actions/alerts";
import { getProfile } from "@/lib/actions/profile";
import { getSessionUserId } from "@/lib/auth/session";
import { formatBRL } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Trash2 } from "lucide-react";
import Link from "next/link";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { created } = await searchParams;
  const [alerts, notifications, profile] = await Promise.all([
    getUserAlerts(userId),
    getUserNotifications(userId, 30),
    getProfile(userId),
  ]);

  const unread = notifications.filter((n) => !n.is_read).length;

  async function createAction(formData: FormData) {
    "use server";
    await createPriceAlert(formData);
    const { redirect } = await import("next/navigation");
    redirect("/alerts?created=1");
  }

  async function markReadAction(formData: FormData) {
    "use server";
    const id = String(formData.get("notification_id") ?? "");
    if (id) await markNotificationRead(id);
  }

  async function markAllAction() {
    "use server";
    await markAllNotificationsRead();
  }

  async function toggleAction(formData: FormData) {
    "use server";
    const id = String(formData.get("alert_id") ?? "");
    const active = String(formData.get("active") ?? "") === "1";
    if (id) await togglePriceAlert(id, active);
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const id = String(formData.get("alert_id") ?? "");
    if (id) await deletePriceAlert(id);
  }

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          Alertas de preço
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Avisos quando o preço atinge seu alvo ou sobe acima do limite na sua cidade.
        </p>
      </div>

      {created === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
          Alerta criado com sucesso.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Notificações {unread > 0 && `(${unread} novas)`}
          </h2>
          {unread > 0 && (
            <form action={markAllAction}>
              <button type="submit" className="text-xs text-emerald-600 font-medium">
                Marcar todas lidas
              </button>
            </form>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma notificação ainda.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  n.is_read
                    ? "bg-slate-50 dark:bg-slate-800/50 text-slate-600"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
                }`}
              >
                <p>{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  {n.observed_price != null && ` · ${formatBRL(n.observed_price)}`}
                </p>
                {!n.is_read && (
                  <form action={markReadAction} className="mt-1">
                    <input type="hidden" name="notification_id" value={n.id} />
                    <button type="submit" className="text-[10px] text-emerald-600 font-medium">
                      Marcar como lida
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Novo alerta</h2>
        <form action={createAction} className="space-y-3">
          <AlertProductSearch onSelect={() => {}} />
          <div>
            <label className="text-xs font-medium text-slate-600">Tipo</label>
            <select
              name="alert_type"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              defaultValue="below_price"
            >
              <option value="below_price">Preço até (oferta)</option>
              <option value="rise_pct">Alta acima de %</option>
            </select>
          </div>
          <input
            name="target_price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Preço alvo (R$) — para oferta"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            name="threshold_pct"
            type="number"
            step="1"
            min="1"
            defaultValue={10}
            placeholder="% de alta — ex.: 10"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            name="city"
            placeholder="Cidade"
            defaultValue={profile?.city ?? ""}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm"
          >
            Criar alerta
          </button>
        </form>
        <p className="text-[10px] text-slate-500">
          Oferta: use preço alvo. Alta: use % (deixe preço vazio). Disparo no máximo 1× por 24h por alerta.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Meus alertas</h2>
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhum alerta. Crie um acima ou em{" "}
            <Link href="/prices" className="text-emerald-600 font-medium">
              Preços
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.product_name}</p>
                  <p className="text-xs text-slate-500">
                    {a.alert_type === "below_price"
                      ? `Até ${formatBRL(Number(a.target_price))}`
                      : `Alta ≥ ${a.threshold_pct}%`}
                    {a.city ? ` · ${a.city}` : ""}
                    {!a.is_active && " · pausado"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <form action={toggleAction}>
                    <input type="hidden" name="alert_id" value={a.id} />
                    <input type="hidden" name="active" value={a.is_active ? "0" : "1"} />
                    <button type="submit" className="text-[10px] text-slate-500 px-2 py-1 border rounded-lg">
                      {a.is_active ? "Pausar" : "Ativar"}
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <input type="hidden" name="alert_id" value={a.id} />
                    <button
                      type="submit"
                      className="p-1 text-red-500"
                      aria-label="Excluir alerta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/receipt" className="block text-center text-sm text-emerald-600 font-medium">
        Importar preços via nota fiscal →
      </Link>
    </div>
  );
}
