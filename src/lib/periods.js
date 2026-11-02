// Period math for the limit: calendar months or calendar weeks.
// Every boundary is built from calendar dates (never by adding 24h steps),
// so weeks stay exactly 7 days across daylight-saving changes.

const DEFAULT_PERIOD = 'month';
const DEFAULT_WEEK_START = 1; // Monday

// Profile settings with defaults for profiles saved before weekly limits existed.
// Uses ?? because 0 (Sunday) is a valid start day.
export const readPeriodSettings = (user) => ({
    period: user?.limitPeriod === 'week' ? 'week' : DEFAULT_PERIOD,
    weekStartsOn: user?.weekStartsOn ?? DEFAULT_WEEK_START,
});

// Local midnight at the start of the month or week that contains `ts`.
export const startOfPeriod = (ts, period, weekStartsOn = DEFAULT_WEEK_START) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    if (period === 'week') {
        d.setDate(d.getDate() - ((d.getDay() - weekStartsOn + 7) % 7));
    } else {
        d.setDate(1);
    }
    return d.getTime();
};

// Start of the period `offset` periods after the one starting at `start`.
const shiftPeriod = (start, period, offset) => {
    const d = new Date(start);
    if (period === 'week') d.setDate(d.getDate() + offset * 7);
    else d.setMonth(d.getMonth() + offset);
    return d.getTime();
};

const shortMonth = (date, locale) => date.toLocaleString(locale ?? 'default', { month: 'short' });

// "Oct 5–11", or "Oct 26–Nov 1" when the week crosses into another month.
export const formatWeekRange = (start, locale) => {
    const from = new Date(start);
    const to = new Date(start);
    to.setDate(to.getDate() + 6);
    const fromMonth = shortMonth(from, locale);
    const toMonth = shortMonth(to, locale);
    return fromMonth === toMonth && from.getFullYear() === to.getFullYear()
        ? `${fromMonth} ${from.getDate()}–${to.getDate()}`
        : `${fromMonth} ${from.getDate()}–${toMonth} ${to.getDate()}`;
};

// The last `n` periods ending with the current one, oldest first. `end` is exclusive.
export const lastPeriods = (n, period, weekStartsOn = DEFAULT_WEEK_START, now = Date.now(), locale) => {
    const current = startOfPeriod(now, period, weekStartsOn);
    const periods = [];
    for (let i = n - 1; i >= 0; i--) {
        const start = shiftPeriod(current, period, -i);
        periods.push({
            start,
            end: shiftPeriod(start, period, 1),
            label: period === 'week' ? formatWeekRange(start, locale) : shortMonth(new Date(start), locale),
            isCurrent: i === 0,
        });
    }
    return periods;
};

export const countInCurrentPeriod = (logs, period, weekStartsOn = DEFAULT_WEEK_START, now = Date.now()) => {
    const start = startOfPeriod(now, period, weekStartsOn);
    const end = shiftPeriod(start, period, 1);
    return logs.filter(l => l.timestamp >= start && l.timestamp < end).length;
};

// When tracking began. Older accounts have no signup date, so fall back to the first log.
// A loop rather than Math.min(...logs), which overflows the stack on very large arrays.
export const getTrackingStart = (logs, trackingSince) => {
    let earliest = trackingSince || Infinity;
    for (const log of logs) {
        if (log.timestamp < earliest) earliest = log.timestamp;
    }
    return earliest === Infinity ? Date.now() : earliest;
};
