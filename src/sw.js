// Service worker: offline caching, silent updates, and (Task 5) the evening reminder.
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';

// The list of app files is injected here at build time.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Every page navigation is served the cached app shell, so the app opens offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Updates apply silently, as before the switch to a custom service worker.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
