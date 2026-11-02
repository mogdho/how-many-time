// Service worker: offline caching, silent updates, and the evening reminder.
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { getUser, getLogs } from './lib/db';
import { getPrefs, updatePrefs } from './lib/prefs';
import { decideReminder, REMINDER_TAG } from './lib/reminder';

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

// Evening reminder. The browser wakes us up roughly daily; decideReminder() decides whether to show anything.

const showReminder = async () => {
    const [profile, prefs, logs] = await Promise.all([getUser(), getPrefs(), getLogs()]);
    const reminder = decideReminder({
        now: Date.now(),
        prefs,
        profile,
        logs,
        permission: self.Notification?.permission,
    });
    if (!reminder) return;
    await self.registration.showNotification(reminder.title, {
        body: reminder.body,
        icon: 'pwa-192x192.png',
        badge: 'pwa-192x192.png',
        tag: REMINDER_TAG,
    });
    await updatePrefs({ lastReminderDay: reminder.dayKey });
};

self.addEventListener('periodicsync', (event) => {
    if (event.tag === REMINDER_TAG) event.waitUntil(showReminder());
});

// Tapping the notification opens the app (which still asks for the PIN or fingerprint).
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (windows.length) return windows[0].focus();
        return self.clients.openWindow('./');
    })());
});
