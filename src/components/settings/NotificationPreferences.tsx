"use client";

import { useState, useTransition } from "react";
import { setNotificationPreference, setQuietHours } from "@/lib/actions/notifications";
import type {
  NotificationPreferences as Prefs,
  NotificationType,
  QuietHours,
} from "@/lib/notifications/preferences";

const ITEMS: { type: NotificationType; label: string; description: string }[] = [
  {
    type: "price_alert",
    label: "Alertas de preço",
    description: "Quando um produto atinge seu alvo ou sobe acima do limite.",
  },
  {
    type: "list_activity",
    label: "Atividade nas listas",
    description: "Quando alguém entra, adiciona, marca ou finaliza listas compartilhadas.",
  },
  {
    type: "repurchase",
    label: "Lembretes de recompra",
    description: "Quando chega a época em que você costuma recomprar algo.",
  },
  {
    type: "price_drop",
    label: "Quedas de preço",
    description: "Quando um produto que você compra fica mais barato na sua cidade.",
  },
  {
    type: "weekly_digest",
    label: "Resumo semanal",
    description: "Um apanhado semanal de recompras e quedas de preço.",
  },
  {
    type: "monthly_summary",
    label: "Resumo do mês",
    description: "Total gasto, número de compras e dica de economia.",
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function Toggle({
  checked,
  busy,
  onClick,
  label,
}: {
  checked: boolean;
  busy: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function NotificationPreferences({
  initial,
  initialQuiet,
}: {
  initial: Prefs;
  initialQuiet: QuietHours;
}) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [quiet, setQuiet] = useState<QuietHours>(initialQuiet);
  const [isPending, startTransition] = useTransition();
  const [pendingType, setPendingType] = useState<NotificationType | "quiet" | null>(null);

  const toggle = (type: NotificationType) => {
    const next = !prefs[type];
    setPrefs((prev) => ({ ...prev, [type]: next }));
    setPendingType(type);
    startTransition(async () => {
      try {
        const updated = await setNotificationPreference(type, next);
        setPrefs(updated);
      } catch {
        setPrefs((prev) => ({ ...prev, [type]: !next }));
      } finally {
        setPendingType(null);
      }
    });
  };

  const persistQuiet = (patch: Partial<QuietHours>) => {
    const next = { ...quiet, ...patch };
    setQuiet(next);
    setPendingType("quiet");
    startTransition(async () => {
      try {
        const offsetMinutes = -new Date().getTimezoneOffset();
        const updated = await setQuietHours({ ...patch, offsetMinutes });
        setQuiet(updated);
      } catch {
        setQuiet(quiet);
      } finally {
        setPendingType(null);
      }
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-1">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
        Tipos de notificação
      </h2>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {ITEMS.map((item) => (
          <li key={item.type} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
            </div>
            <Toggle
              checked={prefs[item.type]}
              busy={isPending && pendingType === item.type}
              onClick={() => toggle(item.type)}
              label={item.label}
            />
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Não perturbe (horário de silêncio)
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Não envia notificações dentro desse período.
            </p>
          </div>
          <Toggle
            checked={quiet.enabled}
            busy={isPending && pendingType === "quiet"}
            onClick={() => persistQuiet({ enabled: !quiet.enabled })}
            label="Horário de silêncio"
          />
        </div>

        {quiet.enabled && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-slate-500">Das</span>
            <select
              value={quiet.start}
              disabled={isPending}
              onChange={(e) => persistQuiet({ start: Number(e.target.value) })}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}h
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">às</span>
            <select
              value={quiet.end}
              disabled={isPending}
              onChange={(e) => persistQuiet({ end: Number(e.target.value) })}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}h
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 pt-2">
        As preferências valem para as notificações push. É preciso ativá-las acima.
      </p>
    </section>
  );
}
