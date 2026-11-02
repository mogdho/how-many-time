import { test, expect } from 'vitest';
import { localDayKey, getStreak, notificationMessage, bannerMessage } from './streak';

// Tests run in America/New_York (see vite.config.js). Today: Mon Nov 2, 2026, 20:00.
const NOW = new Date(2026, 10, 2, 20).getTime();
const at = (m, d, h = 12, min = 0) => new Date(2026, m, d, h, min).getTime();

test('localDayKey pads', () => expect(localDayKey(at(0, 5))).toBe('2026-01-05'));

test('last slip Oct 30 → 3 clean days', () =>
    expect(getStreak([{ timestamp: at(9, 30) }], at(0, 1), NOW)).toEqual({ slippedToday: false, days: 3 }));

test('slip today', () =>
    expect(getStreak([{ timestamp: at(10, 2, 0, 0) }], at(0, 1), NOW)).toEqual({ slippedToday: true, days: 0 }));

test('slip 23:59 yesterday keeps today clean', () =>
    expect(getStreak([{ timestamp: at(10, 1, 23, 59) }], at(0, 1), NOW)).toEqual({ slippedToday: false, days: 1 }));

test('no logs, created today → 1', () => expect(getStreak([], at(10, 2, 9), NOW).days).toBe(1));

test('no logs, created Oct 31 → 3', () => expect(getStreak([], at(9, 31), NOW).days).toBe(3));

test('across DST fall-back (Nov 1 2026, America/New_York)', () =>
    expect(getStreak([{ timestamp: at(9, 30) }], at(0, 1), at(10, 3, 20)).days).toBe(4));

test('notification never names the habit and rotates', () => {
    expect(notificationMessage({ slippedToday: true, days: 0 })).toEqual({ title: 'HMT', body: 'You slipped today. Tomorrow is a fresh day 1.' });
    expect(notificationMessage({ slippedToday: false, days: 1 }).body).toBe("1 clean day. Don't break it tonight.");
    expect(notificationMessage({ slippedToday: false, days: 2 }).body).toBe("Day 2. You're stronger than the urge.");
    expect(notificationMessage({ slippedToday: false, days: 3 }).body).toBe('3 clean days. Keep going.');
    expect(notificationMessage({ slippedToday: false, days: 4 }).body).toBe("4 clean days. Don't break it tonight.");
});

test('banner names the habit with plurals', () => {
    expect(bannerMessage({ slippedToday: false, days: 1 }, 'smoking')).toBe('1 day without smoking. Keep going.');
    expect(bannerMessage({ slippedToday: false, days: 2 }, 'smoking')).toBe('2 days without smoking. Keep going.');
    expect(bannerMessage({ slippedToday: true, days: 0 }, 'smoking')).toBe('You slipped today. Tomorrow is a fresh day 1 without smoking.');
});
