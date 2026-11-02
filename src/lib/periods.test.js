import { test, expect } from 'vitest';
import {
    readPeriodSettings,
    startOfPeriod,
    lastPeriods,
    formatWeekRange,
    countInCurrentPeriod,
    getTrackingStart,
} from './periods';

// Tests run in America/New_York (see vite.config.js) so DST is exercised.
// new Date(2026, 10, 2) is Monday, Nov 2, 2026 at local midnight.

test('readPeriodSettings defaults and keeps Sunday', () => {
    expect(readPeriodSettings({})).toEqual({ period: 'month', weekStartsOn: 1 });
    expect(readPeriodSettings(null)).toEqual({ period: 'month', weekStartsOn: 1 });
    expect(readPeriodSettings({ limitPeriod: 'week', weekStartsOn: 0 })).toEqual({ period: 'week', weekStartsOn: 0 });
});

test('startOfPeriod week, Monday start, mid-week', () => {
    expect(startOfPeriod(new Date(2026, 10, 5, 15).getTime(), 'week', 1)).toBe(new Date(2026, 10, 2).getTime());
});

test('startOfPeriod week, Sunday start, on a Sunday', () => {
    expect(startOfPeriod(new Date(2026, 10, 8, 9).getTime(), 'week', 0)).toBe(new Date(2026, 10, 8).getTime());
});

test('startOfPeriod month', () => {
    expect(startOfPeriod(new Date(2026, 10, 20).getTime(), 'month', 1)).toBe(new Date(2026, 10, 1).getTime());
});

test('lastPeriods weekly labels match the approved mockup', () => {
    const p = lastPeriods(5, 'week', 1, new Date(2026, 10, 2, 12).getTime(), 'en-US');
    expect(p.map(x => x.label)).toEqual(['Oct 5–11', 'Oct 12–18', 'Oct 19–25', 'Oct 26–Nov 1', 'Nov 2–8']);
    expect(p.map(x => x.isCurrent)).toEqual([false, false, false, false, true]);
});

test('lastPeriods monthly labels', () => {
    const p = lastPeriods(5, 'month', 1, new Date(2026, 10, 2).getTime(), 'en-US');
    expect(p.map(x => x.label)).toEqual(['Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
});

test('week across new year', () => {
    expect(formatWeekRange(new Date(2026, 11, 28).getTime(), 'en-US')).toBe('Dec 28–Jan 3');
});

test('DST week is exactly 7 calendar days', () => {
    // US DST starts Sun Mar 8, 2026. Guard: that day is only 23h in the test time zone.
    expect(new Date(2026, 2, 9).getTime() - new Date(2026, 2, 8).getTime()).toBe(23 * 3600 * 1000);
    const [w] = lastPeriods(1, 'week', 1, new Date(2026, 2, 10).getTime(), 'en-US');
    expect(w.start).toBe(new Date(2026, 2, 9).getTime());
    expect(w.end).toBe(new Date(2026, 2, 16).getTime());
    const [prev] = lastPeriods(2, 'week', 1, new Date(2026, 2, 10).getTime(), 'en-US');
    expect(prev.start).toBe(new Date(2026, 2, 2).getTime());
    expect(prev.end).toBe(new Date(2026, 2, 9).getTime());
});

test('log at midnight of week start counts in the new week', () => {
    const now = new Date(2026, 10, 4).getTime();
    const logs = [
        { timestamp: new Date(2026, 10, 2, 0, 0, 0).getTime() },
        { timestamp: new Date(2026, 10, 1, 23, 59).getTime() },
    ];
    expect(countInCurrentPeriod(logs, 'week', 1, now)).toBe(1);
    expect(countInCurrentPeriod(logs, 'month', 1, now)).toBe(2); // both are in November
});

test('getTrackingStart handles many logs and missing createdAt', () => {
    const logs = Array.from({ length: 200000 }, (_, i) => ({ timestamp: 1000 + i }));
    expect(getTrackingStart(logs, undefined)).toBe(1000);
    expect(getTrackingStart(logs, 500)).toBe(500);
    expect(getTrackingStart([], 500)).toBe(500);
});
