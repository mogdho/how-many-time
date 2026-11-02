import 'fake-indexeddb/auto';
import { test, expect, beforeEach } from 'vitest';
import { decideReminder, isReminderSupported, shouldShowReminderCard, enableReminder, disableReminder } from './reminder';
import { getPrefs } from './prefs';
import { wipeData } from './db';

beforeEach(() => wipeData());

const at = (m, d, h = 12, min = 0) => new Date(2026, m, d, h, min).getTime();
const ok = {
    now: at(10, 2, 20),
    prefs: { reminderEnabled: true, lastReminderDay: null },
    profile: { createdAt: at(0, 1) },
    logs: [{ timestamp: at(9, 30) }],
    permission: 'granted',
};

test('shows after 15:00 once per day', () => {
    expect(decideReminder({ ...ok, now: at(10, 2, 15, 0) })).toMatchObject({ title: 'HMT', dayKey: '2026-11-02' });
    expect(decideReminder({ ...ok, now: at(10, 2, 14, 59) })).toBeNull();
    expect(decideReminder({ ...ok, prefs: { ...ok.prefs, lastReminderDay: '2026-11-02' } })).toBeNull();
    expect(decideReminder({ ...ok, prefs: { ...ok.prefs, lastReminderDay: '2026-11-01' } })).not.toBeNull();
});

test('uses the shared streak wording', () => {
    expect(decideReminder(ok).body).toBe('3 clean days. Keep going.');
    expect(decideReminder({ ...ok, logs: [{ timestamp: at(10, 2, 9) }] }).body).toBe('You slipped today. Tomorrow is a fresh day 1.');
});

test('off, no permission, or wiped → nothing', () => {
    expect(decideReminder({ ...ok, prefs: { ...ok.prefs, reminderEnabled: false } })).toBeNull();
    expect(decideReminder({ ...ok, permission: 'default' })).toBeNull();
    expect(decideReminder({ ...ok, profile: null })).toBeNull();
    expect(decideReminder({ ...ok, profile: undefined, logs: [] })).toBeNull();
});

test('body never contains the habit', () => {
    const r = decideReminder({ ...ok, profile: { ...ok.profile, guiltyPleasure: 'smoking' } });
    expect(r.body).not.toMatch(/smoking/i);
});

test('support needs periodicSync and installed', () => {
    expect(isReminderSupported({ periodicSync: {} }, true)).toBe(true);
    expect(isReminderSupported({ periodicSync: {} }, false)).toBe(false);
    expect(isReminderSupported({}, true)).toBe(false);
    expect(isReminderSupported(null, true)).toBe(false);
});

test('card shows once while permission undecided', () => {
    expect(shouldShowReminderCard({ supported: true, permission: 'default', prefs: { reminderPromptShown: false } })).toBe(true);
    expect(shouldShowReminderCard({ supported: true, permission: 'default', prefs: { reminderPromptShown: true } })).toBe(false);
    expect(shouldShowReminderCard({ supported: true, permission: 'denied', prefs: { reminderPromptShown: false } })).toBe(false);
    expect(shouldShowReminderCard({ supported: false, permission: 'default', prefs: { reminderPromptShown: false } })).toBe(false);
    expect(shouldShowReminderCard({ supported: true, permission: 'default', prefs: null })).toBe(false);
});

test('enableReminder registers on grant, not on deny', async () => {
    const tags = [];
    const reg = { periodicSync: { register: async (t, o) => tags.push([t, o.minInterval]) } };
    expect(await enableReminder({ requestPermission: async () => 'granted', registration: reg })).toBe('enabled');
    expect(tags).toEqual([['daily-reminder', 3600000]]);
    expect((await getPrefs()).reminderEnabled).toBe(true);

    await wipeData();
    expect(await enableReminder({ requestPermission: async () => 'denied', registration: reg })).toBe('denied');
    expect((await getPrefs()).reminderEnabled).toBe(false);
});

test('enableReminder reports unsupported when registration fails', async () => {
    const reg = { periodicSync: { register: async () => { throw new DOMException('x', 'NotAllowedError'); } } };
    expect(await enableReminder({ requestPermission: async () => 'granted', registration: reg })).toBe('unsupported');
    expect((await getPrefs()).reminderEnabled).toBe(false);
});

test('disableReminder unregisters and saves off', async () => {
    const removed = [];
    const reg = { periodicSync: { register: async () => {}, unregister: async (t) => removed.push(t) } };
    await enableReminder({ requestPermission: async () => 'granted', registration: reg });
    await disableReminder(reg);
    expect(removed).toEqual(['daily-reminder']);
    expect((await getPrefs()).reminderEnabled).toBe(false);
});

test('reminderResultAlert explains a refused registration, nothing otherwise', async () => {
    const { reminderResultAlert } = await import('./reminder');
    expect(reminderResultAlert('unsupported')).toMatchObject({ title: 'Reminder not available' });
    expect(reminderResultAlert('enabled')).toBeNull();
    expect(reminderResultAlert('denied')).toBeNull();
});
