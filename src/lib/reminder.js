// Evening reminder: when to show it, and turning it on or off.
// Delivered by the browser's Periodic Background Sync (Chrome/Edge, installed app only).
// The browser decides how often it runs, so we show at most one reminder per day, after 15:00.
import { getStreak, notificationMessage, localDayKey } from './streak';
import { updatePrefs } from './prefs';

export const REMINDER_TAG = 'daily-reminder';
export const REMINDER_START_HOUR = 15;
const MIN_INTERVAL_MS = 60 * 60 * 1000;

export const decideReminder = ({ now, prefs, profile, logs, permission }) => {
    if (!profile || !prefs?.reminderEnabled || permission !== 'granted') return null;
    if (new Date(now).getHours() < REMINDER_START_HOUR) return null;
    const dayKey = localDayKey(now);
    if (prefs.lastReminderDay === dayKey) return null;
    return { ...notificationMessage(getStreak(logs, profile.createdAt, now)), dayKey };
};

export const isReminderSupported = (registration, isInstalled) =>
    Boolean(isInstalled && registration && 'periodicSync' in registration);

export const shouldShowReminderCard = ({ supported, permission, prefs }) =>
    Boolean(supported && prefs && !prefs.reminderPromptShown && permission === 'default');

// Must be called from a tap, because browsers only show the permission prompt after one.
export const enableReminder = async ({ requestPermission, registration }) => {
    const permission = await requestPermission();
    if (permission !== 'granted') return 'denied';
    try {
        await registration.periodicSync.register(REMINDER_TAG, { minInterval: MIN_INTERVAL_MS });
    } catch {
        return 'unsupported';
    }
    await updatePrefs({ reminderEnabled: true });
    return 'enabled';
};

export const disableReminder = async (registration) => {
    try {
        await registration?.periodicSync?.unregister(REMINDER_TAG);
    } catch {
        // Nothing registered; turning it off still counts.
    }
    await updatePrefs({ reminderEnabled: false });
};
