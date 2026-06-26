"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";
import { EditProfileDialog } from "./EditProfileDialog";

type Props = {
  name: string;
  avatarUrl?: string | null;
  city: string | null;
  neighborhood: string | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileHeader({ name, avatarUrl, city, neighborhood }: Props) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const displayName = name || "Você";
  const location = [neighborhood, city].filter(Boolean).join(" · ");
  const showAvatar = Boolean(avatarUrl) && !imgError;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Editar perfil"
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-lg font-semibold text-emerald-700 dark:text-emerald-300"
        >
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl as string}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(displayName)
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-white">
              {displayName}
            </h1>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Editar perfil"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">
            {location || "Defina sua cidade"}
          </p>
        </div>
      </header>

      {!city && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <span>
            <MapPin className="h-3.5 w-3.5 inline mr-1" />
            Defina sua cidade para ver preços relevantes na aba{" "}
            <Link href="/prices" className="font-semibold underline">
              Preços
            </Link>
            .
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-amber-200/70 dark:bg-amber-900/60 px-2.5 py-1 font-semibold hover:bg-amber-200 dark:hover:bg-amber-900"
          >
            Editar
          </button>
        </div>
      )}

      <EditProfileDialog
        open={open}
        onClose={() => setOpen(false)}
        initial={{ name, city, neighborhood }}
      />
    </div>
  );
}
