"use client";

import { formatBRL } from "@/lib/utils";
import type { SyncStatus } from "@/lib/hooks/useRealtimeList";
import { cn } from "@/lib/utils";
import { Users, Wifi, WifiOff } from "lucide-react";

type Props = {
  listName: string;
  supermarketName?: string | null;
  total: number;
  uncheckedCount: number;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  onlineUsers: { userId: string; name: string }[];
  shopMode: boolean;
};

function syncLabel(status: SyncStatus, lastSyncedAt: Date | null) {
  if (status === "offline") return "Offline";
  if (status === "connecting") return "Conectando…";
  if (status === "syncing") return "Sincronizando…";
  if (lastSyncedAt) {
    const sec = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
    if (sec < 5) return "Ao vivo";
    return `Atualizado há ${sec}s`;
  }
  return "Ao vivo";
}

export function ListStickyTotal({
  listName,
  supermarketName,
  total,
  uncheckedCount,
  syncStatus,
  lastSyncedAt,
  onlineUsers,
  shopMode,
}: Props) {
  const live = syncStatus === "live";

  return (
    <div
      className={cn(
        "sticky top-12 z-30 -mx-3 px-3 py-2 border-b backdrop-blur-md",
        shopMode
          ? "bg-emerald-600/95 border-emerald-700 text-white"
          : "bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              shopMode ? "text-emerald-100" : "text-slate-500"
            )}
          >
            {listName}
            {supermarketName && ` · ${supermarketName}`}
          </p>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              shopMode ? "text-white" : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {formatBRL(total)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={cn(
              "text-[10px] flex items-center justify-end gap-1",
              shopMode ? "text-emerald-100" : "text-slate-500"
            )}
          >
            {syncStatus === "offline" ? (
              <WifiOff className="h-3 w-3" />
            ) : (
              <Wifi className={cn("h-3 w-3", live && "text-emerald-500")} />
            )}
            {syncLabel(syncStatus, lastSyncedAt)}
          </p>
          {uncheckedCount > 0 && (
            <p className={cn("text-[10px] mt-0.5", shopMode ? "text-emerald-100" : "text-slate-400")}>
              {uncheckedCount} pendente{uncheckedCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
      {onlineUsers.length > 0 && (
        <p
          className={cn(
            "text-[10px] mt-1 flex items-center gap-1",
            shopMode ? "text-emerald-100" : "text-slate-500"
          )}
        >
          <Users className="h-3 w-3" />
          {onlineUsers.map((u) => u.name).join(", ")} na lista
        </p>
      )}
    </div>
  );
}
