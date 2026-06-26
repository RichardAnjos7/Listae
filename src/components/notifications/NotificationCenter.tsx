"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  CheckCheck,
  Repeat,
  Sparkles,
  TrendingDown,
  Users,
  type LucideIcon,
} from "lucide-react";
import { markAllInboxReadAction, markInboxRead } from "@/lib/actions/notifications";
import type { InboxItem } from "@/lib/notifications/inbox";

const ICONS: Record<string, { Icon: LucideIcon; className: string }> = {
  price_alert: { Icon: Bell, className: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
  price_drop: { Icon: TrendingDown, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  list_activity: { Icon: Users, className: "text-sky-600 bg-sky-50 dark:bg-sky-950/40" },
  repurchase: { Icon: Repeat, className: "text-violet-600 bg-violet-50 dark:bg-violet-950/40" },
  weekly_digest: { Icon: Sparkles, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  monthly_summary: { Icon: Sparkles, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
};

export function NotificationCenter({ initial }: { initial: InboxItem[] }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const unread = items.filter((i) => !i.is_read).length;

  const markRead = (item: InboxItem) => {
    if (item.is_read) return;
    setItems((prev) =>
      prev.map((i) => (i.source === item.source && i.id === item.id ? { ...i, is_read: true } : i))
    );
    startTransition(() => markInboxRead(item.source, item.id));
  };

  const markAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    startTransition(() => markAllInboxReadAction());
  };

  const onItemClick = (item: InboxItem) => {
    markRead(item);
    if (item.url) router.push(item.url);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <Bell className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Nenhuma notificação ainda
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Você será avisado aqui sobre alertas de preço, quedas, atividade nas listas e resumos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markAll}
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((item) => {
          const { Icon, className } = ICONS[item.type] ?? ICONS.price_alert;
          return (
            <li key={`${item.source}-${item.id}`}>
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition-colors ${
                  item.is_read
                    ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    : "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20"
                }`}
              >
                <span className={`mt-0.5 shrink-0 rounded-xl p-2 ${className}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.title}
                    </p>
                    {!item.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Não lida" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{item.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
