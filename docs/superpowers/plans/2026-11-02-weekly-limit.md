# Weekly Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user choose a weekly or monthly limit. In weekly mode, the hearts show the last 5 calendar weeks, and the week's start day can be set in settings.

**Architecture:** A new pure module, `src/lib/periods.js`, owns all period math: period starts, the last N periods with labels, the current-period count, and the tracking start date. The hearts, Dashboard, menu, setup and settings all read from it, so the counts always agree. Two new profile fields are added with safe defaults. The IndexedDB version does not change.

**Tech Stack:** React 18, Vite 8, Tailwind 4, Framer Motion, idb. Adds Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-11-02-weekly-limit-design.md`

## Global Constraints

- Profile fields: `limitPeriod: 'month' | 'week'` (missing means `'month'`); `weekStartsOn: 0..6`, Sunday = 0 (missing means `1`, Monday). Read them with `??`, never `||`, because `0` (Sunday) is valid.
- The limit number stays in `user.monthlyLimit` in both modes. Do not rename it.
- Weekly heart labels show only the date range: `Oct 5–11` within one month, `Oct 26–Nov 1` across months. Use an en dash (–). The current period's label is peach (`text-peach`). No "This wk" or "x wks ago" wording.
- Wording follows the mode: "Weekly fault"/"Monthly fault", "Weekly limit"/"Monthly limit", "this week"/"this month", and "your weekly limit of N"/"your monthly limit of N".
- The Seven-day slip chart's behavior does not change.
- The "Week starts on" picker appears only in settings, and only when Week is selected. It shows all 7 days, starting with Monday: Mo Tu We Th Fr Sa Su.
- Use existing styles (`.auth-input`, `.btn`, `.field-label`, color tokens). Do not use raw hex colors in new UI.
- Work on branch `feature/weekly-limit`, not `main`, because pushing to `main` deploys.

## Review Focus

1. **A week that crosses into a new year**, e.g. Dec 28 to Jan 3, should be labelled `Dec 28–Jan 3` and count logs from both years. Tested in Task 1.
2. **Daylight-saving changes:** a week containing a DST switch must still be exactly 7 calendar days, with no shift by an hour. Tested in Task 1 by running the tests in `America/New_York`.
3. **Sunday start on a Sunday:** with `weekStartsOn = 0` and today being Sunday, the current week starts today, not 7 days ago. Tested in Task 1.
4. **Old profiles without the new fields** fall back to month and Monday. `weekStartsOn: 0` must not turn into Monday. Tested in Task 1 (`readPeriodSettings`).
5. **A log exactly at midnight on a week's start day** belongs to the new week, not the old one. Tested in Task 1.

---

### Task 1: Period math module + test setup

**Files:**
- Create: `src/lib/periods.js`
- Create: `src/lib/periods.test.js`
- Modify: `package.json` (add `vitest` devDependency, `"test": "vitest run"` script)
- Modify: `vite.config.js` (add `test: { env: { TZ: 'America/New_York' } }`)
- Modify: `.gitignore` (add `.superpowers/`)

**Interfaces:**
- Produces:
  - `readPeriodSettings(user) -> { period: 'month'|'week', weekStartsOn: number }`
  - `startOfPeriod(ts: number, period, weekStartsOn) -> number` (local midnight)
  - `lastPeriods(n: number, period, weekStartsOn, now = Date.now(), locale?) -> Array<{ start: number, end: number, label: string, isCurrent: boolean }>`, oldest first. `end` is exclusive.
  - `formatWeekRange(start: number, locale?) -> string`
  - `countInCurrentPeriod(logs: {timestamp:number}[], period, weekStartsOn, now = Date.now()) -> number`
  - `getTrackingStart(logs, trackingSince?) -> number` (moved here from WeeklyChart, written as a loop instead of `Math.min(...)`)

- [ ] **Step 1: Create the branch and install Vitest**

Run: `git checkout -b feature/weekly-limit && npm install && npm install -D vitest`
Expected: install succeeds. If npm reports a peer conflict with Vite 8, install the newest Vitest major that lists `vite@^8` as a peer.

- [ ] **Step 2: Write the failing tests in `src/lib/periods.test.js`**

Import `test` and `expect` from `vitest`, and the functions from `./periods`. Use local-time dates: `new Date(2026, 10, 2).getTime()` is Mon Nov 2, 2026. Pass `'en-US'` as the locale.

```js
test('readPeriodSettings defaults and keeps Sunday', () => {
  expect(readPeriodSettings({})).toEqual({ period: 'month', weekStartsOn: 1 });
  expect(readPeriodSettings(null)).toEqual({ period: 'month', weekStartsOn: 1 });
  expect(readPeriodSettings({ limitPeriod: 'week', weekStartsOn: 0 })).toEqual({ period: 'week', weekStartsOn: 0 });
});
test('startOfPeriod week, Monday start, mid-week', () => {
  expect(startOfPeriod(new Date(2026, 10, 5, 15).getTime(), 'week', 1)).toBe(new Date(2026, 10, 2).getTime());
});
test('startOfPeriod week, Sunday start, on a Sunday', () => {
  expect(startOfPeriod(new Date(2026, 10, 8, 9).getTime(), 'week', 0)).toBe(new Date(2026, 10, 8).getTime());
});
test('startOfPeriod month', () => {
  expect(startOfPeriod(new Date(2026, 10, 20).getTime(), 'month', 1)).toBe(new Date(2026, 10, 1).getTime());
});
test('lastPeriods weekly labels match the approved mockup', () => {
  const p = lastPeriods(5, 'week', 1, new Date(2026, 10, 2, 12).getTime(), 'en-US');
  expect(p.map(x => x.label)).toEqual(['Oct 5–11', 'Oct 12–18', 'Oct 19–25', 'Oct 26–Nov 1', 'Nov 2–8']);
  expect(p.map(x => x.isCurrent)).toEqual([false, false, false, false, true]);
});
test('lastPeriods monthly labels', () => {
  const p = lastPeriods(5, 'month', 1, new Date(2026, 10, 2).getTime(), 'en-US');
  expect(p.map(x => x.label)).toEqual(['Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
});
test('week across new year', () => {
  expect(formatWeekRange(new Date(2026, 11, 28).getTime(), 'en-US')).toBe('Dec 28–Jan 3');
});
test('DST week is exactly 7 calendar days', () => {
  // US DST starts Sun Mar 8, 2026
  const [w] = lastPeriods(1, 'week', 1, new Date(2026, 2, 10).getTime(), 'en-US');
  expect(w.start).toBe(new Date(2026, 2, 9).getTime());
  expect(w.end).toBe(new Date(2026, 2, 16).getTime());
  const [prev] = lastPeriods(2, 'week', 1, new Date(2026, 2, 10).getTime(), 'en-US');
  expect(prev.start).toBe(new Date(2026, 2, 2).getTime());
  expect(prev.end).toBe(new Date(2026, 2, 9).getTime());
});
test('log at midnight of week start counts in the new week', () => {
  const now = new Date(2026, 10, 4).getTime();
  const logs = [{ timestamp: new Date(2026, 10, 2, 0, 0, 0).getTime() }, { timestamp: new Date(2026, 10, 1, 23, 59).getTime() }];
  expect(countInCurrentPeriod(logs, 'week', 1, now)).toBe(1);
  expect(countInCurrentPeriod(logs, 'month', 1, now)).toBe(2); // both are in November
});
test('getTrackingStart handles many logs and missing createdAt', () => {
  const logs = Array.from({ length: 200000 }, (_, i) => ({ timestamp: 1000 + i }));
  expect(getTrackingStart(logs, undefined)).toBe(1000);
  expect(getTrackingStart(logs, 500)).toBe(500);
  expect(getTrackingStart([], 500)).toBe(500);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. The module `./periods` can't be resolved, or its exports are undefined.

- [ ] **Step 4: Implement `src/lib/periods.js`**

- Build every boundary with `new Date(y, m, d)` or `setDate(...)`, never by adding `DAY_MS`. This keeps DST weeks at 7 calendar days.
- Week start: `d.setDate(d.getDate() - ((d.getDay() - weekStartsOn + 7) % 7))` at local midnight.
- Month labels: `toLocaleString(locale ?? 'default', { month: 'short' })`. This matches the current behavior.
- `formatWeekRange`: the end is start + 6 days. If the months are the same, use `` `${Mon} ${d1}–${d2}` ``; otherwise use `` `${Mon1} ${d1}–${Mon2} ${d2}` ``.
- `getTrackingStart` with empty logs and no `trackingSince` returns `Date.now()` (the current behavior).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests in `periods.test.js` PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.js .gitignore src/lib/periods.js src/lib/periods.test.js
git commit -m "feat: add period math for weekly and monthly limits"
```

---

### Task 2: Hearts show weeks or months

**Files:**
- Modify: `src/components/WeeklyChart.jsx` (`MonthlyHearts` lines 88–154; `getTrackingStart` lines 13–16; `SevenDaySlip` line 160)

**Interfaces:**
- Consumes: `lastPeriods`, `startOfPeriod`, `getTrackingStart` from Task 1.
- Produces: `<WeeklyChart mode="historical" logs monthlyLimit trackingSince limitPeriod weekStartsOn />`. The two new props are optional and default to `'month'` and `1`.

- [ ] **Step 1: Replace the inline month loop in `MonthlyHearts`**

Use `lastPeriods(5, limitPeriod, weekStartsOn)`. Each item's `noData` is `start < startOfPeriod(getTrackingStart(logs, trackingSince), limitPeriod, weekStartsOn)`, and its count is `countBetween(logs, start, end)`. Add `limitPeriod` and `weekStartsOn` to the `useMemo` deps.

- [ ] **Step 2: Labels and wording**

- The label `<span>` uses `text-peach` when `isCurrent`. Otherwise it keeps the existing muted and no-data classes.
- Labels longer than 9 characters (for example `Oct 26–Nov 1`) get `text-[9px] tracking-normal`. All labels get `whitespace-nowrap`.
- The footnote reads `Each heart drains as you get closer to your ${limitPeriod === 'week' ? 'weekly' : 'monthly'} limit of {limit}.`
- The dashed-heart note reads `' Dashed hearts are weeks before you started.'` in weekly mode and `'… months before you started.'` in monthly mode.
- The tooltip `title` keeps the same format, using `label`.

- [ ] **Step 3: Remove the local `getTrackingStart` and import it from `../lib/periods`**

`SevenDaySlip` keeps using it. Its behavior doesn't change.

- [ ] **Step 4: Verify the build**

Run: `npm run build && npm test`
Expected: the build succeeds and the tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/WeeklyChart.jsx
git commit -m "feat: hearts show last 5 weeks in weekly mode"
```

---

### Task 3: Setup, settings, dashboard and menu

**Files:**
- Create: `src/components/PeriodToggle.jsx`
- Modify: `src/components/AuthSetup.jsx`
- Modify: `src/components/Dashboard.jsx` (state at lines 30–37, `openSettings` at 86–96, `handleSaveSettings` at 98–128, counts at 132–138, chart props at 179–180, settings form at 289–323)
- Modify: `src/components/MenuSheet.jsx` (line 94)
- Modify: `README.md`

**Interfaces:**
- Consumes: `readPeriodSettings`, `countInCurrentPeriod` from Task 1; the new `WeeklyChart` props from Task 2.
- Produces: `PeriodToggle({ value: 'month'|'week', onChange })`, which is a two-button segmented control with Week on the left and Month on the right. The selected button gets a `bg-peach text-navy` background. The buttons are `type="button"`, and the control uses `role="radiogroup"`/`aria-checked`.

- [ ] **Step 1: Setup screen**

- Add `limitPeriod` state with default `'week'`, matching the approved mockup.
- Render `<PeriodToggle>` labelled "Limit per", above the limit field.
- The limit label reads "Weekly limit" or "Monthly limit". The placeholder reads `e.g. 5` or `e.g. 20`.
- `saveUserDB` also saves `limitPeriod` and `weekStartsOn: 1`.

- [ ] **Step 2: Settings form**

- Add `editLimitPeriod` and `editWeekStartsOn` state, filled from `readPeriodSettings(user)` in `openSettings`.
- Add `PeriodToggle` above the limit field, with the label following the mode.
- When the period is `'week'`, show a "Week starts on" row: 7 `type="button"` buttons `Mo Tu We Th Fr Sa Su` mapped to `[1,2,3,4,5,6,0]`. The selected one gets `bg-peach text-navy`, and each has `aria-pressed`. Add the hint "Changes how weeks are grouped in the hearts."
- Saving writes `limitPeriod` and `weekStartsOn`.

- [ ] **Step 3: Dashboard counts and headings**

- Replace `currentMonthCount` with `currentPeriodCount = countInCurrentPeriod(logs, period, weekStartsOn)`, where `{ period, weekStartsOn } = readPeriodSettings(user)`.
- Delete the unused `isOverLimit`.
- The section title reads "Weekly fault" or "Monthly fault".
- Pass `limitPeriod={period}` and `weekStartsOn={weekStartsOn}` to the historical `WeeklyChart`.
- Pass `monthCount` to MenuSheet, renamed `periodCount`, plus `periodLabel={period === 'week' ? 'this week' : 'this month'}`.

- [ ] **Step 4: Menu line**

In `MenuSheet.jsx`, rename the prop `monthCount` to `periodCount` and add `periodLabel`. The line reads `{user?.guiltyPleasure} · {periodCount}{limit ? ` of ${limit}` : ''} {periodLabel}`. Change the "Change credentials" subtitle to "Name, habit, limit, week start, PIN".

- [ ] **Step 5: README**

In "How it works", the setup step mentions choosing a **weekly or monthly limit**. The hearts bullet says each heart is a month, or a week in weekly mode, and that the week's start day is set in **Change credentials**.

- [ ] **Step 6: Verify the build and run a manual check in the browser**

Run: `npm run build && npm test`, then `npm run dev`. Check each of these in a fresh browser profile, using Playwright if available:
1. Set up with Week and limit 5. The heading reads "Weekly fault". The 5 labels are date ranges ending with the current week, which is in peach.
2. Tap GUILTY 6 times. The current week's heart breaks, and the menu reads "6 of 5 this week".
3. In settings, set "Week starts on" to Su and save. The hearts regroup by Sunday.
4. In settings, switch to Month and save. The day row disappears, the heading reads "Monthly fault", and the labels show months. The counts are unchanged.
5. In the dev tools console, remove `limitPeriod` and `weekStartsOn` from the profile in IndexedDB and reload. The app shows monthly mode with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/PeriodToggle.jsx src/components/AuthSetup.jsx src/components/Dashboard.jsx src/components/MenuSheet.jsx README.md
git commit -m "feat: choose weekly or monthly limit and week start day"
```
