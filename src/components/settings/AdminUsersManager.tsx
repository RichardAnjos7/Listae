"use client";

import {
  demoteUserFromForm,
  promoteUserFromForm,
  searchUsersForAdmin,
  type AdminUserRow,
} from "@/lib/actions/admins";
import { Shield, ShieldOff, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

type Props = {
  admins: AdminUserRow[];
  currentUserId: string;
};

function displayName(user: AdminUserRow) {
  if (user.username) return `@${user.username}`;
  return user.name || "Sem nome";
}

export function AdminUsersManager({ admins, currentUserId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const rows = await searchUsersForAdmin(query);
        setResults(rows);
        if (rows.length === 0) {
          setMessage("Nenhum usuário encontrado.");
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Erro ao buscar usuários.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Administradores</p>
        <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
          Admins podem publicar no catálogo, revisar sugestões e gerenciar mercados.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-amber-900/90 dark:text-amber-200/90">Atuais</p>
        <ul className="space-y-2">
          {admins.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-white/70 dark:bg-slate-900/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {displayName(user)}
                  {user.id === currentUserId && (
                    <span className="ml-1 text-xs font-normal text-slate-500">(você)</span>
                  )}
                </p>
                {user.name && user.username && (
                  <p className="text-xs text-slate-500 truncate">{user.name}</p>
                )}
              </div>
              {user.is_root ? (
                <span className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 shrink-0">
                  Raiz
                </span>
              ) : (
                <form action={demoteUserFromForm}>
                  <input type="hidden" name="user_id" value={user.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label={`Remover admin de ${displayName(user)}`}
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por usuário ou nome…"
          minLength={2}
          className="flex-1 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <button
          type="submit"
          disabled={pending || query.trim().length < 2}
          className="rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 text-sm font-medium shrink-0"
        >
          {pending ? "…" : "Buscar"}
        </button>
      </form>

      {message && (
        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-950/40 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {displayName(user)}
                </p>
                {user.name && user.username && (
                  <p className="text-xs text-slate-500 truncate">{user.name}</p>
                )}
              </div>
              {user.is_admin ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </span>
              ) : (
                <form action={promoteUserFromForm}>
                  <input type="hidden" name="user_id" value={user.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Tornar admin
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
