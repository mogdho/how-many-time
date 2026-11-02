// Clean-day streak and the reminder wording. Shared by the app and the service worker,
// so the notification and the in-app banner always show the same number.
import { getTrackingStart } from './periods';

const midnight = (ts) => {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const pad = (n) => String(n).padStart(2, '0');

export const localDayKey = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// A clean day has zero logs. Days are counted on the calendar (not in 24h steps), including today.
export const getStreak = (logs, createdAt, now = Date.now()) => {
    const today = midnight(now);
    let lastLog = -Infinity;
    for (const log of logs) {
        if (log.timestamp <= now && log.timestamp > lastLog) lastLog = log.timestamp;
    }
    if (lastLog >= today.getTime()) return { slippedToday: true, days: 0 };

    const trackingStart = midnight(getTrackingStart(logs, createdAt));
    let start = trackingStart;
    if (lastLog !== -Infinity) {
        const dayAfterLast = midnight(lastLog);
        dayAfterLast.setDate(dayAfterLast.getDate() + 1);
        if (dayAfterLast > start) start = dayAfterLast;
    }

    let days = 0;
    for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) days++;
    return { slippedToday: false, days: Math.max(days, 1) };
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const CLEAN_LINES = [
    (n) => `${plural(n, 'clean day')}. Keep going.`,
    (n) => `${plural(n, 'clean day')}. Don't break it tonight.`,
    (n) => `Day ${n}. You're stronger than the urge.`,
];

// Lock-screen text: never names the habit.
export const notificationMessage = (streak) => ({
    title: 'HMT',
    body: streak.slippedToday
        ? 'You slipped today. Tomorrow is a fresh day 1.'
        : CLEAN_LINES[streak.days % CLEAN_LINES.length](streak.days),
});

// In-app text: may name the habit, because the app is behind the PIN.
export const bannerMessage = (streak, habit) =>
    streak.slippedToday
        ? `You slipped today. Tomorrow is a fresh day 1 without ${habit}.`
        : `${plural(streak.days, 'day')} without ${habit}. Keep going.`;
