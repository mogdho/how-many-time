// App preferences, kept in their own record so the service worker never rewrites the profile.
import { initDB } from './db';

const STORE_USER = 'user';
const PREFS_KEY = 'prefs';

export const DEFAULT_PREFS = {
    installPromptShown: false,
    reminderPromptShown: false,
    reminderEnabled: false,
    lastReminderDay: null,
};

export const getPrefs = async () => {
    const db = await initDB();
    return { ...DEFAULT_PREFS, ...(await db.get(STORE_USER, PREFS_KEY)) };
};

export const updatePrefs = async (patch) => {
    const db = await initDB();
    const tx = db.transaction(STORE_USER, 'readwrite');
    const merged = { ...DEFAULT_PREFS, ...(await tx.store.get(PREFS_KEY)), ...patch };
    await tx.store.put(merged, PREFS_KEY);
    await tx.done;
    return merged;
};
