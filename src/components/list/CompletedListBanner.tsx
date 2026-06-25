"use client";

import { formatBRL } from "@/lib/utils";
import { Check, History, Plus } from "lucide-react";
import Link from "next/link";

type Props = {
  listName: string;
  total: number;
};

export function CompletedListBanner({ listName, total }: Props) {
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">Lista concluída</p>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80 truncate">{listName}</p>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
            {formatBRL(total)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          href="/history"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white py-2 text-xs font-medium"
        >
          <History className="h-3.5 w-3.5" />
          Histórico
        </Link>
        <Link
          href="/lists/new"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 py-2 text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova lista
        </Link>
      </div>
    </div>
  );
}
