import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { getMyInbox } from "@/lib/actions/notifications";
import { getSessionUserId } from "@/lib/auth/session";
import { Bell } from "lucide-react";
import Link from "next/link";

export default async function NotificationsPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const items = await getMyInbox(40);

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-600" />
          Notificações
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Alertas de preço, quedas, atividade nas listas e resumos.
        </p>
      </div>

      <NotificationCenter initial={items} />

      <p className="text-xs text-slate-500 text-center">
        Gerencie seus alertas de preço em{" "}
        <Link href="/prices" className="text-emerald-600 font-medium">
          Preços
        </Link>
        .
      </p>
    </div>
  );
}
