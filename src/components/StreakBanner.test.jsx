import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, expect } from 'vitest';
import StreakBanner from './StreakBanner';

const user = { createdAt: new Date(2026, 0, 1).getTime(), guiltyPleasure: 'smoking' };

test('renders nothing until logs have loaded, so it never flashes a wrong count', () => {
    expect(renderToStaticMarkup(<StreakBanner logs={[]} loaded={false} user={user} now={Date.now()} />)).toBe('');
});

test('renders the streak once loaded', () => {
    const now = new Date(2026, 10, 2, 20).getTime();
    const html = renderToStaticMarkup(<StreakBanner logs={[{ timestamp: now - 1000 }]} loaded user={user} now={now} />);
    expect(html).toContain('You slipped today. Tomorrow is a fresh day 1 without smoking.');
});
