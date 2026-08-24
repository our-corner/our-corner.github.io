/**
 * Our Corner service worker — PUSH ONLY.
 *
 * It deliberately does NOT cache anything and does NOT handle `fetch`. The app is
 * served from GitHub Pages with hashed asset names; a caching worker would only
 * risk pinning someone to a stale build. The single reason this file exists is
 * that a Push subscription requires a registered service worker, and on iOS a
 * home-screen web app is the only place push is delivered at all.
 *
 * Payloads are GENERIC by design. The backend never holds the passcode and never
 * decrypts (see worker/src/index.ts), so it cannot know what a plan is called —
 * it only knows a plan exists tomorrow, from the plaintext date column. The
 * notification says that much and nothing more; tapping it opens the app, which
 * decrypts locally and shows the real thing.
 */

const DEFAULT_TITLE = "Our Corner";
const APP_ICON = "/icons/icon-192.png";

self.addEventListener("install", () => {
  // Take over immediately so the first subscription works without a reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || DEFAULT_TITLE;
  const options = {
    body: payload.body || "",
    icon: APP_ICON,
    badge: APP_ICON,
    // One notification per reminder, replacing an earlier one for the same item
    // if the backend ever re-sends it.
    tag: payload.tag || "our-corner",
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
