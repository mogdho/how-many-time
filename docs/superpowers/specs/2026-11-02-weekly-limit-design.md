# Weekly limit option — design

## Intent
Today the app only supports a monthly limit, and the hearts show the last 5 months. Users should be able to choose a weekly limit instead. In weekly mode, the hearts show the last 5 calendar weeks.

## Decisions (from the user)
- At setup, the user chooses **Monthly** or **Weekly** for their limit.
- Weekly mode uses **calendar weeks** that start on a fixed day.
- The user can choose the **week start day in settings**. The default is **Monday**.
- Weekly hearts show the **last 5 calendar weeks** (the current week plus the 4 before it).
- Approach **A** (chosen over B, a separate WeeklyHearts component, and C, storing per-week counts): one shared helper builds the period ranges, and everything else uses it.

## Proposals the user didn't object to (my calls)
- The settings form can switch between monthly and weekly at any time. Hearts are calculated from timestamps, so switching only redraws them.
- All 7 days are offered as the start day. The picker appears only in settings, not during setup.
- **Heart labels in weekly mode (user's choice, after seeing mockups):** each heart shows only its week's date range, e.g. "Oct 5–11". A week that crosses months shows both months ("Oct 26–Nov 1") in slightly smaller text. The current week's label is highlighted in peach, the same way the current month is now. No "This wk" or "x wks ago" wording.
- Existing profiles with no `limitPeriod` are treated as monthly. No database version change is needed.
- The Seven-day slip chart stays a rolling 7 days in both modes.
- Wording follows the mode: "Weekly fault"/"Monthly fault" heading, "this week"/"this month" in the menu, "Weekly limit"/"Monthly limit" field label, and the hearts footnote. The README gets updated too.

## Data
The profile gains two fields:
- `limitPeriod`: `'month' | 'week'`. Missing means `'month'`.
- `weekStartsOn`: `0..6` (Sunday = 0). Missing means `1` (Monday).

`monthlyLimit` stays as the stored field name for the limit number in both modes, so old profiles keep working. The UI labels it according to the mode.

## Approach A: shared helper
A new module, `src/lib/periods.js`:
- `startOfPeriod(ts, period, weekStartsOn)` returns the start of the month or week containing `ts`.
- `lastPeriods(n, period, weekStartsOn, now)` returns `[{start, end, label, isCurrent}]`, oldest first.
- `countInCurrentPeriod(logs, period, weekStartsOn)` gives the count for the menu and the over-limit check.

The hearts component replaces its inline month loop with `lastPeriods`. "No data" means `start < startOfPeriod(trackingStart)`. The Dashboard's `currentMonthCount` becomes `currentPeriodCount`.

Also fix `getTrackingStart`, which uses `Math.min(...logs)` and can overflow the stack. Replace it with a loop.

## Non-goals
- Several habits, per-entry notes, streaks.
- Changing how the Seven-day slip chart works.

## Left to the builder
- Exact placement and styling of the Monthly/Weekly toggle and the day picker, using the existing `.auth-input` and `.btn` styles.
- Tests for `periods.js`. The project has no test runner, so use a small Vitest setup or a plain Node script.
