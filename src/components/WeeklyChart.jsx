import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip
);

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

const HEART_RED = '#ce2626';
const HEART_YELLOW_GREEN = '#383b16';  // deep dark depressing yellowish green
const HEART_DARK_GREEN = '#152614';    // dark green
const HEART_DARK = '#0f120a';          // dark olive black

// 4-stop gradient: red → dark yellowish green → dark green → dark olive
const getHeartColor = (count, limit) => {
    if (count === 0) return HEART_RED;
    if (count >= limit) return HEART_DARK;
    const ratio = count / limit;
    if (ratio <= 0.33) {
        // red → dark yellowish green
        return lerpColor(HEART_RED, HEART_YELLOW_GREEN, ratio / 0.33);
    } else if (ratio <= 0.66) {
        // dark yellowish green → dark green
        return lerpColor(HEART_YELLOW_GREEN, HEART_DARK_GREEN, (ratio - 0.33) / 0.33);
    } else {
        // dark green → dark olive
        return lerpColor(HEART_DARK_GREEN, HEART_DARK, (ratio - 0.66) / 0.34);
    }
};

const HeartIcon = ({ color, size = 64 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const BrokenHeartIcon = ({ color, size = 64 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left half */}
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09L12 8l-2 3 2 3-1 4z" fill={color} />
        {/* Right half - shifted right */}
        <g transform="translate(2.5, -1.5)">
            <path d="M10 22.85l1-4-2-3 2-3-2.5-3.76C9.59 6.81 11.26 6 13 6c3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L10 22.85z" fill={color} />
        </g>
    </svg>
);

const WeeklyChart = ({ logs, mode = 'historical', monthlyLimit }) => {
    const data = useMemo(() => {
        const now = new Date();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        startOfThisWeek.setHours(0, 0, 0, 0);

        if (mode === 'historical') {
            const months = [];
            
            for (let i = 4; i >= 0; i--) {
                const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
                const count = logs.filter((l) => l.timestamp >= start.getTime() && l.timestamp < end.getTime()).length;
                const label = start.toLocaleString('default', { month: 'short' });
                months.push({ label, count });
            }

            return {
                isHistoricalCustom: true,
                months,
                hasData: months.some((m) => m.count > 0)
            };
        } else {
            // Current Week Mode: Breakdown by Weekdays (Sun-Sat) with Comparison
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const startOfLastWeek = new Date(startOfThisWeek);
            startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

            const comparisonData = days.map((label, i) => {
                // This week
                const start = new Date(startOfThisWeek);
                start.setDate(startOfThisWeek.getDate() + i);
                const end = new Date(start);
                end.setDate(start.getDate() + 1);
                const count = logs.filter((l) => l.timestamp >= start.getTime() && l.timestamp < end.getTime()).length;

                // Last week
                const lastStart = new Date(startOfLastWeek);
                lastStart.setDate(startOfLastWeek.getDate() + i);
                const lastEnd = new Date(lastStart.getTime() + (24 * 60 * 60 * 1000));
                const lastCount = logs.filter((l) => l.timestamp >= lastStart.getTime() && l.timestamp < lastEnd.getTime()).length;

                return { label, count, lastCount };
            });

            return {
                labels: comparisonData.map((d) => d.label),
                datasets: [
                    {
                        label: 'This Week',
                        data: comparisonData.map((d) => d.count),
                        backgroundColor: 'rgba(239, 188, 126, 0.82)',
                        borderColor: '#efbc7e',
                        borderWidth: 1,
                        borderRadius: 14,
                        barThickness: 34,
                        order: 2,
                    },
                    {
                        label: 'Last Week',
                        data: comparisonData.map((d) => d.lastCount),
                        backgroundColor: 'rgba(129, 152, 226, 0.7)',
                        borderColor: 'rgba(159, 185, 255, 0.95)',
                        borderWidth: 1,
                        borderRadius: 10,
                        barThickness: 12,
                        order: 1,
                    }
                ],
                hasData: comparisonData.some((d) => d.count > 0 || d.lastCount > 0)
            };
        }
    }, [logs, mode]);

    const options = {
        indexAxis: 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(8, 13, 26, 0.95)',
                titleColor: '#f7f1e8',
                bodyColor: '#d7ddea',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                cornerRadius: 14,
                padding: 12,
                callbacks: {
                    label: (context) => {
                        return ` ${context.dataset.label}: ${context.raw}`;
                    }
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.06)', drawBorder: false },
                ticks: { color: 'rgba(236, 238, 245, 0.58)', font: { size: 10 }, stepSize: 1 }
            },
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: 'rgba(236, 238, 245, 0.72)', font: { size: 10, weight: 700 } }
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        }
    };

    if (!data.hasData) {
        return (
            <div className="chart-empty-state">
                <span className="chart-empty-state__label">
                    {mode === 'historical' ? 'No historical activity' : 'No activity this week'}
                </span>
            </div>
        );
    }

    if (data.isHistoricalCustom) {
        const limit = monthlyLimit || 30;

        return (
            <div className="history-hearts">
                {data.months.map((m, idx) => {
                    const isBroken = m.count > limit;
                    const heartColor = isBroken ? HEART_DARK : getHeartColor(m.count, limit);

                    return (
                        <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1, duration: 0.4 }}
                            className="history-hearts__item"
                        >
                            <div className="history-hearts__icon" style={{ filter: `drop-shadow(0 10px 18px ${heartColor}55)` }}>
                                <motion.div
                                    initial={{ scale: 0.5 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.12 }}
                                >
                                    {isBroken 
                                        ? <BrokenHeartIcon color={heartColor} size={52} />
                                        : <HeartIcon color={heartColor} size={52} />
                                    }
                                </motion.div>
                                {!isBroken && (
                                    <span className="history-hearts__count" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                                        {m.count}
                                    </span>
                                )}
                            </div>
                            <span className="history-hearts__month">
                                {m.label}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        );
    }

    return (
        <div style={{ width: '100%' }}>
            <div className="chart-bar-card">
                <Bar data={data} options={options} />
            </div>
        </div>
    );
};

export default WeeklyChart;
