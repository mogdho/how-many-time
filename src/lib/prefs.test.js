import 'fake-indexeddb/auto';
import { test, expect, beforeEach } from 'vitest';
import { getPrefs, updatePrefs } from './prefs';
import { saveUser, getUser, wipeData } from './db';

beforeEach(() => wipeData());

test('defaults when nothing saved', async () =>
    expect(await getPrefs()).toEqual({ installPromptShown: false, reminderPromptShown: false, reminderEnabled: false, lastReminderDay: null }));

test('updatePrefs merges and persists', async () => {
    await updatePrefs({ installPromptShown: true });
    expect((await getPrefs()).installPromptShown).toBe(true);
    expect((await getPrefs()).reminderEnabled).toBe(false);
});

test('prefs do not touch the profile', async () => {
    await saveUser({ username: 'a' });
    await updatePrefs({ reminderEnabled: true });
    expect(await getUser()).toEqual({ username: 'a' });
});

test('wipe clears prefs', async () => {
    await updatePrefs({ installPromptShown: true });
    await wipeData();
    expect((await getPrefs()).installPromptShown).toBe(false);
});
