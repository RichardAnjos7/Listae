/* eslint-disable */
// Custom service worker importado pelo next-pwa no sw.js gerado.
// Responsável por exibir Web Push na barra de notificações do sistema
// (mesmo com o PWA fechado/minimizado ou a tela bloqueada) e atualizar
// o contador no ícone do app (Badging API).

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Listaê", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Listaê";
  const url = payload.url || "/";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "listae",
    renotify: true,
    data: { url },
  };

  const tasks = [self.registration.showNotification(title, options)];

  if (typeof payload.badge === "number" && self.navigator && self.navigator.setAppBadge) {
    if (payload.badge > 0) {
      tasks.push(self.navigator.setAppBadge(payload.badge).catch(() => {}));
    } else if (self.navigator.clearAppBadge) {
      tasks.push(self.navigator.clearAppBadge().catch(() => {}));
    }
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            if ("navigate" in client) {
              await client.navigate(targetUrl);
            }
            return client.focus();
          }
        } catch (e) {
          /* ignore */
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
