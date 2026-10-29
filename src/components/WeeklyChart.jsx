import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (ts) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

// When tracking began. Older accounts have no signup date, so fall back to the first log.
const getTrackingStart = (logs, trackingSince) => {
    const firstLog = logs.length ? Math.min(...logs.map(l => l.timestamp)) : Date.now();
    return Math.min(trackingSince || Infinity, firstLog);
};

const countBetween = (logs, from, to) => logs.filter(l => l.timestamp >= from && l.timestamp < to).length;
// Interpolate between two hex colors
const lerpColor = (a, b, t) => {
    const ah = parseInt(a.replace('#', ''), 16);
    const bh = parseInt(b.replace('#', ''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `rgb(${rr}, ${rg}, ${rb})`;
};

// Monthly hearts: a full heart drains from the top as you approach your limit,
// and turns into a grey broken heart once you go over it.
const HEART_FULL = '#ff4d6d';   // bright red: plenty of room left
const HEART_LOW = '#ae2448';    // crimson: almost at the limit
const HEART_BROKEN = '#8b90a8'; // grey: over the limit

const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const HEART_TOP = 3;
const HEART_HEIGHT = 18.35;

const getHeartColor = (count, limit) => lerpColor(HEART_FULL, HEART_LOW, Math.min(count / limit, 1));

const DrainingHeart = ({ id, color, fill, delay, size = 52 }) => {
    const clipId = `heart-clip-${id}`;
    const filledTop = HEART_TOP + (1 - fill) * HEART_HEIGHT;
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <clipPath id={clipId}>
                    <path d={HEART_PATH} />
                </clipPath>
            </defs>
            {/* Empty part of the heart */}
            <path d={HEART_PATH} fill="rgba(255, 255, 255, 0.1)" />
            {/* Filled part, drains from the top */}
            <motion.rect
                x="0"
                width="24"
                height="24"
                fill={color}
                clipPath={`url(#${clipId})`}
                initial={{ attrY: HEART_TOP + HEART_HEIGHT }}
                animate={{ attrY: filledTop }}
                transition={{ duration: 0.8, ease: 'easeOut', delay }}
            />
            {/* Outline so the shape stays visible when nearly empty */}
            <path d={HEART_PATH} fill="none" stroke={color} strokeWidth="1.2" />
        </svg>
    );
};

// Months before tracking began: faint dashed outline, no fill
const NoDataHeart = ({ size = 52 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d={HEART_PATH} fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" strokeDasharray="1.6 1.4" />
    </svg>
);

const BrokenHeartIcon =({ color, size = 52 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09L12 8l-2 3 2 3-1 4z" fill={color} />
        <g transform="translate(2.5, -1.5)">
            <path d="M10 22.85l1-4-2-3 2-3-2.5-3.76C9.59 6.81 11.26 6 13 6c3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L10 22.85z" fill={color} />
        </g>
    </svg>
);

const MonthlyHearts = ({ logs, monthlyLimit, trackingSince }) => {
    const data = useMemo(() => {
        const now = new Date();
        const startedAt = new Date(getTrackingStart(logs, trackingSince));
        const startedMonth = new Date(startedAt.getFullYear(), startedAt.getMonth(), 1).getTime();
        const months = [];
        for (let i = 4; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            months.push({
                label: start.toLocaleString('default', { month: 'short' }),
                count: countBetween(logs, start.getTime(), end.getTime()),
                noData: start.getTime() < startedMonth,
            });
        }
        return { months };
    }, [logs, trackingSince]);

        const limit = monthlyLimit || 30; // limit is required at signup; this only guards old data

        return (
            <div className="glass w-full rounded-3xl px-3 py-6 md:p-8">
                <div className="grid grid-cols-5 gap-1 md:gap-6">
                    {data.months.map((m, idx) => {
                        const isBroken = m.count > limit;
                        const heartColor = isBroken ? HEART_BROKEN : getHeartColor(m.count, limit);
                        const fill = Math.max(0, 1 - m.count / limit);

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1, duration: 0.4 }}
                                className="flex flex-col items-center group"
                                title={m.noData ? `${m.label}: no data (before you started tracking)` : `${m.label}: ${m.count} of ${limit}`}
                            >
                                {m.noData ? (
                                    <div className="relative flex items-center justify-center w-16 h-16">
                                        <NoDataHeart />
                                        <span className="absolute text-white/40 font-black text-sm">–</span>
                                    </div>
                                ) : (
                                    <div className="relative flex items-center justify-center w-16 h-16 transition-transform group-hover:scale-110" style={{ filter: `drop-shadow(0 4px 12px ${isBroken ? 'rgba(0,0,0,0.35)' : heartColor + '55'})` }}>
                                        {isBroken
                                            ? <BrokenHeartIcon color={heartColor} />
                                            : <DrainingHeart id={idx} color={heartColor} fill={fill} delay={idx * 0.12} />
                                        }
                                        <span className="absolute flex items-center justify-center text-white font-black text-sm tracking-tighter tabular-nums" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                                            {m.count}
                                        </span>
                                    </div>
                                )}
                                <span className={`mt-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${m.noData ? 'text-white/30' : 'text-muted group-hover:text-white'}`}>
                                    {m.label}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
                <p className="mt-5 text-[11px] text-muted">
                    Each heart drains as you get closer to your limit of {limit}.
                    {data.months.some(m => m.noData) && ' Dashed hearts are months before you started.'}
                </p>
            </div>
        );
};

// Last 7 days ending today, each compared with the same weekday one week earlier.
const SevenDaySlip = ({ logs, trackingSince }) => {
    const { days, total, prevTotal, hasPrev } = useMemo(() => {
        const today = startOfDay(Date.now());
        const startedDay = startOfDay(getTrackingStart(logs, trackingSince));
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const start = today - i * DAY_MS;
            const prevStart = start - 7 * DAY_MS;
            days.push({
                key: start,
                label: i === 0 ? 'Today' : new Date(start).toLocaleString('default', { weekday: 'short' }),
                isToday: i === 0,
                count: countBetween(logs, start, start + DAY_MS),
                prev: countBetween(logs, prevStart, prevStart + DAY_MS),
                noData: start < startedDay,
                prevNoData: prevStart < startedDay,
            });
        }
        return {
            days,
            total: days.reduce((s, d) => s + d.count, 0),
            prevTotal: days.reduce((s, d) => s + d.prev, 0),
            hasPrev: days.some(d => !d.prevNoData),
        };
    }, [logs, trackingSince]);

    const max = Math.max(3, ...days.map(d => Math.max(d.count, d.prev)));
    const diff = total - prevTotal;

    let trend;
    if (!hasPrev) trend = { text: 'First week of tracking', cls: 'text-muted border-line' };
    else if (diff < 0) trend = { text: `▼ ${-diff} vs previous 7 days`, cls: 'text-peach border-peach/40 bg-peach/10' };
    else if (diff > 0) trend = { text: `▲ ${diff} vs previous 7 days`, cls: 'text-[#ff8a9f] border-crimson/60 bg-crimson/20' };
    else trend = { text: 'Same as previous 7 days', cls: 'text-muted border-line' };

    return (
        <div className="glass w-full rounded-3xl px-4 py-6 md:p-8">
            {/* Summary */}
            <div className="flex flex-col items-center gap-3 mb-6">
                <p className="flex items-baseline gap-2">
                    <span className="font-display italic text-4xl tabular-nums text-[#ff4d6d] drop-shadow-[0_2px_10px_rgba(255,77,109,0.35)] pr-[0.1em]">{total}</span>
                    <span className="text-muted text-sm font-semibold">{total === 1 ? 'slip' : 'slips'} in the last 7 days</span>
                </p>
                <span className={`text-[11px] font-bold tracking-wider px-3 py-1 rounded-full border ${trend.cls}`}>
                    {trend.text}
                </span>
            </div>

            {/* Bars */}
            <div className="grid grid-cols-7 gap-1.5 md:gap-3 h-36 items-end">
                {days.map((d, idx) => {
                    const h = (d.count / max) * 100;
                    const prevH = (d.prev / max) * 100;
                    return (
                        <div
                            key={d.key}
                            className="relative h-full flex flex-col justify-end items-center"
                            title={d.noData ? `${d.label}: before you started tracking` : `${d.label}: ${d.count} (week before: ${d.prevNoData ? 'no data' : d.prev})`}
                        >
                            {d.noData ? (
                                <div className="w-full max-w-9 h-2 rounded-md border border-dashed border-white/30" />
                            ) : (
                                <div className="relative w-full max-w-9 h-full flex items-end justify-center">
                                    {/* Week before: faint ghost bar */}
                                    {!d.prevNoData && d.prev > 0 && (
                                        <div className="absolute bottom-0 inset-x-0 rounded-md bg-white/15 border border-white/25" style={{ height: `${prevH}%` }} />
                                    )}
                                    {/* Count above the bar */}
                                    {d.count > 0 && (
                                        <span className="absolute inset-x-0 text-center text-xs font-black text-text tabular-nums" style={{ bottom: `calc(${h}% + 4px)` }}>
                                            {d.count}
                                        </span>
                                    )}
                                    {/* Last 7 days */}
                                    <motion.div
                                        className={`relative w-[70%] rounded-md ${d.isToday ? 'bg-peach shadow-[0_0_16px_rgba(239,188,126,0.6)]' : 'bg-peach/80'}`}
                                        initial={{ height: 0 }}
                                        animate={{ height: d.count > 0 ? `${h}%` : 3 }}
                                        transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.05 }}
                                        style={d.count > 0 ? undefined : { opacity: 0.35 }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1.5 md:gap-3 mt-2 border-t border-line pt-2">
                {days.map(d => (
                    <span
                        key={d.key}
                        className={`text-center text-[10px] font-bold uppercase tracking-wider ${d.isToday ? 'text-peach' : d.noData ? 'text-white/30' : 'text-muted'}`}
                    >
                        {d.label}
                    </span>
                ))}
            </div>

            {/* Key */}
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-5 text-[11px] text-muted">
                <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-peach/80 inline-block" />Last 7 days</span>
                <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-white/15 border border-white/25 inline-block" />Week before</span>
                {days.some(d => d.noData) && (
                    <span className="flex items-center gap-1.5"><i className="w-3 h-2 rounded-sm border border-dashed border-white/30 inline-block" />Before you started</span>
                )}
            </div>
        </div>
    );
};

const WeeklyChart = ({ mode = 'historical', ...props }) =>
    mode === 'current' ? <SevenDaySlip {...props} /> : <MonthlyHearts {...props} />;

export default WeeklyChart;
