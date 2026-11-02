import React from 'react';
import { Flame, HeartCrack } from 'lucide-react';
import { getStreak, bannerMessage } from '../lib/streak';

// Same day count as the evening reminder. Inside the app it can name the habit.
const StreakBanner = ({ logs, user, now }) => {
    if (!user) return null;
    const streak = getStreak(logs, user.createdAt, now);
    const habit = user.guiltyPleasure || 'your habit';
    const Icon = streak.slippedToday ? HeartCrack : Flame;
    return (
        <p
            role="status"
            className={`glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-semibold max-w-full ${streak.slippedToday ? 'text-[#ff8a9f]' : 'text-peach'}`}
        >
            <Icon size={16} className="shrink-0" />
            <span className="text-left">{bannerMessage(streak, habit)}</span>
        </p>
    );
};

export default StreakBanner;
