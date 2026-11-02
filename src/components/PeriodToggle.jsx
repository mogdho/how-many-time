import React from 'react';

// Week / Month switch for the limit period.
export const PERIOD_OPTIONS = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
];

// Day buttons for "Week starts on", Monday first. Values match Date.getDay() (Sunday = 0).
export const WEEK_DAYS = [
    { value: 1, label: 'Mo' },
    { value: 2, label: 'Tu' },
    { value: 3, label: 'We' },
    { value: 4, label: 'Th' },
    { value: 5, label: 'Fr' },
    { value: 6, label: 'Sa' },
    { value: 0, label: 'Su' },
];

const segmentClass = (selected) =>
    `py-2 rounded-[10px] text-sm font-extrabold transition-colors ${selected ? 'bg-peach text-navy' : 'text-muted hover:text-text'}`;

const PeriodToggle = ({ value, onChange, labelledBy }) => (
    <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/5 border border-line"
    >
        {PERIOD_OPTIONS.map((opt) => (
            <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={value === opt.value}
                onClick={() => onChange(opt.value)}
                className={segmentClass(value === opt.value)}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

export const WeekStartPicker = ({ value, onChange, labelledBy }) => (
    <div role="group" aria-labelledby={labelledBy} className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((day) => (
            <button
                key={day.value}
                type="button"
                aria-pressed={value === day.value}
                onClick={() => onChange(day.value)}
                className={`py-2 rounded-[10px] text-xs font-extrabold border transition-colors ${value === day.value ? 'bg-peach text-navy border-peach' : 'bg-white/5 text-muted border-line hover:text-text'}`}
            >
                {day.label}
            </button>
        ))}
    </div>
);

export default PeriodToggle;
