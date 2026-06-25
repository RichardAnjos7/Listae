"use client";

import { deleteListFromForm } from "@/lib/actions/lists";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Props = {
  id: string;
  name: string;
  status: string;
  supermarketName: string | null;
  canDelete: boolean;
};

export function ListRow({ id, name, status, supermarketName, canDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  const statusLabel =
    status === "active" ? "Ativa" : status === "completed" ? "Concluída" : status;

  const statusClass =
    status === "active"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : status === "completed"
        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        : "bg-slate-100 text-slate-500";

  return (
    <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        <Link href={`/lists/${id}`} className="flex-1 min-w-0 p-4">
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">{name}</p>
              {supermarketName && (
                <p className="text-xs text-slate-500 truncate">{supermarketName}</p>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 h-fit ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>
        </Link>

        {canDelete && (
          <div className="flex items-center border-l border-slate-100 dark:border-slate-800 px-1">
            {confirming ? (
              <form action={deleteListFromForm} className="flex flex-col gap-1 p-2">
                <input type="hidden" name="list_id" value={id} />
                <p className="text-[10px] text-slate-500 max-w-[5.5rem] leading-tight">
                  Excluir esta lista?
                </p>
                <div className="flex gap-1">
                  <button
                    type="submit"
                    className="text-[10px] font-medium text-red-600 px-1.5 py-0.5 rounded"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded"
                  >
                    Não
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="p-3 text-slate-400 hover:text-red-600"
                aria-label="Excluir lista"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
