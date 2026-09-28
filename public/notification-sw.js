/* global self */
// 알림 표시와 클릭만 담당한다. 타이머 예약·오프라인 캐시는 만들지 않는다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const app = clients.find((client) =>
          client.url.startsWith(self.registration.scope)
        );
        if (app) {
          await app.focus();
        } else {
          await self.clients.openWindow(self.registration.scope);
        }
      })
  );
});
