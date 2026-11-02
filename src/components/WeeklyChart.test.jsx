import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, expect, vi, afterEach } from 'vitest';
import WeeklyChart from './WeeklyChart';

afterEach(() => vi.useRealTimers());

const at = (y, m, d, h = 12) => new Date(y, m, d, h).getTime();

// Today: Mon Nov 2, 2026, noon.
const renderHearts = (props) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 12));
    return renderToStaticMarkup(<WeeklyChart mode="historical" monthlyLimit={5} {...props} />);
};

const labelsOf = (html) =>
    [...html.matchAll(/<span class="mt-2 [^"]*">(.*?)<\/span>/g)].map(m => m[1].replace(/<br\/>/g, ''));

test('weekly mode shows date ranges for the last 5 weeks', () => {
    const html = renderHearts({ logs: [], trackingSince: at(2026, 0, 1), limitPeriod: 'week', weekStartsOn: 1 });
    expect(labelsOf(html)).toEqual(['Oct 5–11', 'Oct 12–18', 'Oct 19–25', 'Oct 26–Nov 1', 'Nov 2–8']);
    expect(html).toContain('your weekly limit of 5');
});

test('weekly mode counts logs per week and breaks a heart over the limit', () => {
    const logs = [
        ...Array.from({ length: 6 }, () => ({ timestamp: at(2026, 9, 13) })), // week of Oct 12
        { timestamp: at(2026, 10, 2) }, // this week
    ];
    const html = renderHearts({ logs, trackingSince: at(2026, 0, 1), limitPeriod: 'week', weekStartsOn: 1 });
    expect(html).toContain('title="Oct 12–18: 6 of 5"');
    expect(html).toContain('title="Nov 2–8: 1 of 5"');
});

test('current period label is highlighted', () => {
    const html = renderHearts({ logs: [], trackingSince: at(2026, 0, 1), limitPeriod: 'week', weekStartsOn: 1 });
    expect(html).toMatch(/<span class="mt-2 [^"]*text-peach[^"]*">Nov 2–8<\/span>/);
});

test('weeks before tracking started are dashed and explained', () => {
    const html = renderHearts({ logs: [], trackingSince: at(2026, 9, 20), limitPeriod: 'week', weekStartsOn: 1 });
    expect(html).toContain('title="Oct 5–11: no data (before you started tracking)"');
    expect(html).toContain('title="Oct 19–25: 0 of 5"');
    expect(html).toContain('Dashed hearts are weeks before you started.');
});

test('Sunday start regroups the weeks', () => {
    const html = renderHearts({ logs: [], trackingSince: at(2026, 0, 1), limitPeriod: 'week', weekStartsOn: 0 });
    expect(labelsOf(html)).toEqual(['Oct 4–10', 'Oct 11–17', 'Oct 18–24', 'Oct 25–31', 'Nov 1–7']);
});

test('profiles without a period still show months', () => {
    const html = renderHearts({ logs: [], trackingSince: at(2026, 0, 1) });
    expect(labelsOf(html)).toHaveLength(5);
    expect(labelsOf(html)[4]).toBe(new Date(2026, 10, 1).toLocaleString('default', { month: 'short' }));
    expect(html).toContain('your monthly limit of 5');
});

test('a week crossing months breaks onto two lines after the dash', () => {
    const html = renderHearts({ logs: [], trackingSince: at(2026, 0, 1), limitPeriod: 'week', weekStartsOn: 1 });
    expect(html).toContain('>Oct 26–<br/>Nov 1</span>');
    expect(html).toContain('>Oct 5–11</span>');
});

test('weekly labels are not uppercased, so they stay narrow on phones', () => {
    const html = renderHearts({ logs: [], trackingSince: at(2026, 0, 1), limitPeriod: 'week', weekStartsOn: 1 });
    const weekly = [...html.matchAll(/<span class="(mt-2 [^"]*)">/g)].map(m => m[1]);
    expect(weekly.every(c => !c.split(' ').includes('uppercase'))).toBe(true);
});

test('hearts follow the now prop, so a new week shows after the app was left open', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 12));
    const html = renderToStaticMarkup(
        <WeeklyChart mode="historical" monthlyLimit={5} logs={[]} trackingSince={at(2026, 0, 1)}
            limitPeriod="week" weekStartsOn={1} now={at(2026, 10, 9)} />
    );
    expect(labelsOf(html)[4]).toBe('Nov 9–15');
});
