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
            const months = [];
            
            for (let i = 4; i >= 0; i--) {
                const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
                const count = logs.filter(l => l.timestamp >= start.getTime() && l.timestamp < end.getTime()).length;
                const label = start.toLocaleString('default', { month: 'short' });
                months.push({ label, count });
            }

            return {
                isHistoricalCustom: true,
                months,
                hasData: months.some(m => m.count > 0)
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
                            const weekColors = ['#003049', '#d62828', '#f77f00', '#fcbf49', '#53cbf3', '#5478ff', '#111fa2'];
                            const today = new Date().getDay();
                            // High opacity for today, slightly muted for other days
                            return i === today ? weekColors[i] : weekColors[i] + '80'; // '80' appends 50% opacity
                        }),
                        borderColor: comparisonData.map((_, i) => {
                            const weekColors = ['#003049', '#d62828', '#f77f00', '#fcbf49', '#53cbf3', '#5478ff', '#111fa2'];
                            return weekColors[i];
                        }),
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
                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 }, stepSize: 1 }
            },
            x: {
                stacked: true, // This effectively centers both bars at the same point when not 'grouped'
                grid: { display: false },
                ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 } }
            }
        },
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        }
    };

    if (!data.hasData) {
        return (
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-[#EFBC7E]/30 rounded-2xl w-full">
                <span className="text-white/60 text-[10px] uppercase tracking-widest text-center px-6">
                    {mode === 'historical' ? 'No historical activity' : 'No activity this week'}
                </span>
            </div>
        )
    }

    if (data.isHistoricalCustom) {
        const maxExpected = Math.max(...data.months.map(m => m.count), 15);
        
        const circleColors = ['#4e8d9c', '#85c79a', '#edf7bd', '#ffc570', '#fbe8ce', '#faacbf'];

        return (
            <div className="flex flex-row flex-wrap justify-center items-center gap-4 md:gap-8 w-full mt-4 bg-white/5 rounded-3xl p-6 md:p-8 border border-white/10 shadow-lg">
                {data.months.map((m, idx) => {
                    const radius = 24;
                    const circumference = 2 * Math.PI * radius;
                    const percent = Math.min((m.count / maxExpected) * 100, 100);
                    const strokeDashoffset = circumference - (percent / 100) * circumference;
                    const strokeColor = circleColors[idx % circleColors.length];
                    
                    return (
                        <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1, duration: 0.4 }}
                            className="flex flex-col items-center group"
                        >
                            <div className="relative flex items-center justify-center w-16 h-16 transition-transform group-hover:scale-105">
                                <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 60 60">
                                    {/* Track */}
                                    <circle 
                                        cx="30" cy="30" r={radius} 
                                        stroke="rgba(255, 255, 255, 0.1)" 
                                        strokeWidth="5" 
                                        fill="rgba(255,255,255,0.05)" 
                                    />
                                    {/* Progress */}
                                    <motion.circle 
                                        cx="30" cy="30" r={radius} 
                                        stroke={strokeColor} 
                                        strokeWidth="5" 
                                        fill="transparent" 
                                        strokeLinecap="round"
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset: strokeDashoffset }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: idx * 0.1 }}
                                        style={{ strokeDasharray: circumference }}
                                    />
                                </svg>
                                <span className="absolute flex items-center justify-center text-white font-black text-sm tracking-tighter">
                                    {m.count}
                                </span>
                            </div>
                            <span className="mt-3 text-[11px] text-white/70 font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                                {m.label}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="relative w-full">
            <div className="h-48 w-full bg-white/5 rounded-3xl p-6 border border-white/10 shadow-lg">
                <Bar data={data} options={options} />
            </div>
        </div>
    );
};

export default WeeklyChart;
