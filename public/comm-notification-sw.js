/* Communication desktop notifications (WhatsApp-style) for background tabs. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const conversationKey = String(event.notification?.data?.conversationKey || '').trim();
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        try {
          client.postMessage({
            type: 'OPEN_COMM_CONVERSATION',
            conversationKey,
          });
        } catch (_err) {
          // ignore
        }
        if ('focus' in client) {
          try {
            await client.focus();
          } catch (_err) {
            // ignore
          }
          return;
        }
      }

      const targetUrl = conversationKey
        ? `/communication?open=${encodeURIComponent(conversationKey)}`
        : '/communication';
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
