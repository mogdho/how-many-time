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

const WeeklyChart = ({ logs, mode = 'historical' }) => {
    const data = useMemo(() => {
        const now = new Date();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        startOfThisWeek.setHours(0, 0, 0, 0);

        if (mode === 'historical') {
            // Historical Mode: Past Months, 3w Ago, 2w Ago, Last Week
            const weeks = [1, 2, 3].map(i => {
                const start = new Date(startOfThisWeek);
                start.setDate(startOfThisWeek.getDate() - (i * 7));
                const end = new Date(start);
                end.setDate(start.getDate() + 7);
                const count = logs.filter(l => l.timestamp >= start.getTime() && l.timestamp < end.getTime()).length;
                let label = i === 1 ? "Last Week" : `${i}w Ago`;
                return { start, count, label };
            }).reverse();

            const earliestWeekStart = weeks[0].start.getTime();
            const historicalCount = logs.filter(l => l.timestamp < earliestWeekStart).length;

            const allData = [
                { label: 'Past Months', count: historicalCount },
                ...weeks
            ];

            return {
                labels: allData.map(d => d.label),
                datasets: [{
                    data: allData.map(d => d.count),
                    backgroundColor: [
                        'rgba(248, 85, 100, 0.1)',
                        'rgba(248, 85, 100, 0.4)',
                        'rgba(248, 85, 100, 0.6)',
                        'rgba(248, 85, 100, 0.8)'
                    ],
                    borderColor: 'rgba(248, 85, 100, 1)',
                    borderWidth: 1,
                    borderRadius: 12,
                    barThickness: 60,
                }],
                hasData: allData.some(d => d.count > 0)
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
                const count = logs.filter(l => l.timestamp >= start.getTime() && l.timestamp < end.getTime()).length;

                // Last week
                const lastStart = new Date(startOfLastWeek);
                lastStart.setDate(startOfLastWeek.getDate() + i);
                const lastEnd = new Date(lastStart);
                lastEnd.setDate(lastStart.getTime() + (24 * 60 * 60 * 1000));
                const lastCount = logs.filter(l => l.timestamp >= lastStart.getTime() && l.timestamp < lastEnd.getTime()).length;

                return { label, count, lastCount };
            });

            return {
                labels: comparisonData.map(d => d.label),
                datasets: [
                    {
                        label: 'This Week',
                        data: comparisonData.map(d => d.count),
                        backgroundColor: comparisonData.map((_, i) => {
                            const today = new Date().getDay();
                            return i === today ? 'rgba(248, 85, 100, 1)' : 'rgba(248, 85, 100, 0.4)';
                        }),
                        borderColor: 'rgba(248, 85, 100, 0.6)',
                        borderWidth: 1,
                        borderRadius: 8,
                        barThickness: 34,
                        order: 2,
                    },
                    {
                        label: 'Last Week',
                        data: comparisonData.map(d => d.lastCount),
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: 'rgba(255, 255, 255, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barThickness: 8,
                        order: 1,
                    }
                ],
                hasData: comparisonData.some(d => d.count > 0 || d.lastCount > 0)
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
                backgroundColor: '#fff',
                titleColor: '#333',
                bodyColor: '#000',
                borderColor: '#eee',
                borderWidth: 1,
                cornerRadius: 8,
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
                grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
                ticks: { color: '#999', font: { size: 10 }, stepSize: 1 }
            },
            x: {
                stacked: true, // This effectively centers both bars at the same point when not 'grouped'
                grid: { display: false },
                ticks: { color: '#666', font: { size: 10 } }
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        }
    };

    if (!data.hasData) {
        return (
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-[#f85564]/20 rounded-2xl">
                <span className="text-[#333] text-[10px] uppercase tracking-widest text-center px-6">
                    {mode === 'historical' ? 'No historical activity' : 'No activity this week'}
                </span>
            </div>
        )
    }

    return (
        <div className="relative">
            <div className="h-48">
                <Bar data={data} options={options} />
            </div>
        </div>
    );
};

export default WeeklyChart;
