"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Share, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type State = "checking" | "installed" | "available" | "ios" | "unavailable";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppButton() {
  const [state, setState] = useState<State>("checking");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) {
      setState("installed");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setState("available");
    };
    const onInstalled = () => setState("installed");

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Sem evento de instalação: iOS mostra instruções, demais ficam indisponíveis.
    setState(isIos() ? "ios" : "unavailable");

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setState("installed");
    setDeferred(null);
  }, [deferred]);

  if (state === "checking" || state === "unavailable") return null;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2">
          <Smartphone className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Instalar o Listaê
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Adicione à tela inicial para abrir como app, em tela cheia e com notificações.
          </p>
        </div>
      </div>

      {state === "installed" && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          App já instalado neste dispositivo.
        </div>
      )}

      {state === "available" && (
        <button
          type="button"
          onClick={install}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" />
          Instalar app
        </button>
      )}

      {state === "ios" && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          No iPhone/iPad: toque em <Share className="inline h-3.5 w-3.5" /> Compartilhar e depois em
          “Adicionar à Tela de Início”.
        </p>
      )}
    </section>
  );
}
