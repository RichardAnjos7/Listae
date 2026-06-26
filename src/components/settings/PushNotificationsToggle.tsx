"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

export type PushState =
  | "loading"
  | "unsupported"
  | "default"
  | "denied"
  | "subscribed"
  | "working";

type State = PushState;

type NavigatorWithBadge = Navigator & {
  clearAppBadge?: () => Promise<void>;
};

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

/**
 * `navigator.serviceWorker.ready` nunca resolve quando não há service worker
 * registrado (ex.: dev com PWA desativado). Aplicamos um timeout para evitar
 * que o botão fique preso em "Processando...".
 */
async function getReadyRegistration(
  timeoutMs = 8000
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export function PushNotificationsToggle({
  onStateChange,
}: {
  onStateChange?: (state: PushState) => void;
} = {}) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!ok) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          setState("default");
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "subscribed" : "default");
      } catch {
        setState("default");
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    setError(null);
    setInfo(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) {
        setError("Servidor sem chave VAPID configurada. Avise o administrador.");
        setState("default");
        return;
      }
      const { key } = (await keyRes.json()) as { key: string };

      const reg = await getReadyRegistration();
      if (!reg) {
        setError(
          "Service worker não está ativo. Em desenvolvimento, defina NEXT_PUBLIC_ENABLE_PWA_DEV=true no .env.local e reinicie o servidor — ou teste com build de produção (npm run build && npm start)."
        );
        setState("default");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(key),
      });

      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!save.ok) {
        setError("Não foi possível salvar a inscrição.");
        setState("default");
        return;
      }

      setState("subscribed");
      setInfo("Notificações ativadas neste dispositivo.");
    } catch {
      setError("Não foi possível ativar as notificações.");
      setState("default");
    }
  }, []);

  const disable = useCallback(async () => {
    setError(null);
    setInfo(null);
    setState("working");
    try {
      const reg = await getReadyRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      const nav = navigator as NavigatorWithBadge;
      if (nav.clearAppBadge) await nav.clearAppBadge().catch(() => {});
      setState("default");
      setInfo("Notificações desativadas neste dispositivo.");
    } catch {
      setState("subscribed");
      setError("Não foi possível desativar agora.");
    }
  }, []);

  const sendTest = useCallback(async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (res.ok) {
        setInfo("Notificação de teste enviada. Confira a barra de notificações.");
      } else {
        setError("Falha ao enviar o teste.");
      }
    } catch {
      setError("Falha ao enviar o teste.");
    }
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2">
          {state === "subscribed" ? (
            <BellRing className="h-5 w-5 text-emerald-600" />
          ) : (
            <Bell className="h-5 w-5 text-emerald-600" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Notificações push
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Receba alertas de preço na barra de notificações, mesmo com o app fechado. Funciona
            melhor com o Listaê instalado na tela inicial.
          </p>
        </div>
      </div>

      {state === "loading" && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando…
        </div>
      )}

      {state === "unsupported" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Este navegador não suporta notificações push. No iPhone, adicione o app à Tela de Início
          (Safari → Compartilhar → Adicionar à Tela de Início).
        </p>
      )}

      {state === "denied" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          As notificações estão bloqueadas. Libere nas permissões do site/app no seu navegador e
          tente de novo.
        </p>
      )}

      {state === "default" && (
        <button
          type="button"
          onClick={enable}
          className="w-full rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm hover:bg-emerald-700"
        >
          Ativar notificações
        </button>
      )}

      {state === "working" && (
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-emerald-600/70 text-white font-medium py-2.5 text-sm flex items-center justify-center gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Processando…
        </button>
      )}

      {state === "subscribed" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={sendTest}
            className="flex-1 rounded-xl border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium py-2.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            Enviar teste
          </button>
          <button
            type="button"
            onClick={disable}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <BellOff className="h-4 w-4" />
            Desativar
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
      {info && <p className="text-xs text-emerald-600 dark:text-emerald-400">{info}</p>}
    </section>
  );
}
