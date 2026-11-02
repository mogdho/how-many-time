# Reminder, Install Prompt & Fingerprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time install prompt, optional fingerprint unlock, and a daily reminder that is sent on the device after 3 pm with a clean-day streak, plus an in-app banner showing the same streak.

**Architecture:** Pure logic goes in small `src/lib` modules with Vitest tests:
- `streak.js` works out the day count and the message text. The app and the service worker both use it.
- `prefs.js` keeps a separate IndexedDB record.
- `install.js`, `biometric.js` and `reminder.js` decide what should happen.

React components only render what those modules decide. vite-plugin-pwa switches to `injectManifest` with a hand-written `src/sw.js` that handles precaching, silent auto-update, `periodicsync` and `notificationclick`.

**Tech Stack:** React 18, Vite 8, vite-plugin-pwa 2 (`injectManifest`), workbox-precaching/routing (already installed), idb 7, Vitest 5, fake-indexeddb (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-11-02-reminder-install-fingerprint-design.md`

## Global Constraints

- No server and no network calls. Everything runs on the device.
- Notification title is `HMT`. **Notification text never contains the habit name.** The banner inside the app may name it.
- Clean day = zero logs that local calendar day. The streak start is the later of (the day after the last log) and (the tracking start from `getTrackingStart(logs, createdAt)`). The count includes today when today has no logs.
- Reminder window: local **15:00–23:59**, at most once per local day (`lastReminderDay` is `YYYY-MM-DD`). Periodic sync tag: `daily-reminder`, registered with `minInterval: 60 * 60 * 1000`.
- The reminder is offered only when `'periodicSync' in registration` **and** the app is running installed (standalone). In a browser tab, the menu shows "Install the app to get an evening reminder." in place of the switch.
- `prefs` record in store `user`, key `prefs`, with defaults `{ installPromptShown: false, reminderPromptShown: false, reminderEnabled: false, lastReminderDay: null }`. `profile` gains `biometricCredentialId` (base64url). The DB version stays 1.
- The install prompt and the reminder card are each shown at most once. Every way of closing one marks it as shown.
- A fingerprint failure doesn't change `failedAttempts`. A fingerprint success sets it to 0. Changing the PIN removes `biometricCredentialId`.
- Updates stay silent: `sw.js` calls `self.skipWaiting()` on install and `clients.claim()` on activate, and handles a `{type:'SKIP_WAITING'}` message.
- Copy (exact text):
  - Slip notification: `You slipped today. Tomorrow is a fresh day 1.`
  - Slip banner: `You slipped today. Tomorrow is a fresh day 1 without {habit}.`
  - Clean banner: `{n} day(s) without {habit}. Keep going.`
  - Clean notifications rotate by `n % 3`:
    - `{n} clean day(s). Keep going.`
    - `{n} clean day(s). Don't break it tonight.`
    - `Day {n}. You're stronger than the urge.`
  - Use singular for `n === 1`.
- Branch `feature/reminders` is created from `feature/weekly-limit`.

## Review Focus

1. **A wipe while the reminder is registered:** when the sync fires, there's no profile, so no notification is shown and nothing crashes. Tested in Task 5 (`decideReminder` with `profile: null`).
2. **Two syncs on the same evening** show only one notification. Tested in Task 5 (`lastReminderDay`).
3. **The registered fingerprint has been deleted from the phone,** or the user cancels. The unlock screen falls back to the PIN with no error message and no wipe counter change. Tested in Task 3 (`verifyBiometric` resolves `false` when `credentials.get` rejects).
4. **Notification permission is denied** at the reminder card. The card is marked shown, the reminder stays off, and the menu switch stays off with a hint. Tested in Task 5 (`enableReminder` returns `'denied'`).
5. **A log just before midnight yesterday versus just after midnight today:** the first leaves today clean, the second makes today a slip. Tested in Task 1.

---

### Task 1: Streak and message logic

**Files:**
- Create: `src/lib/streak.js`
- Create: `src/lib/streak.test.js`

**Interfaces:**
- Consumes: `getTrackingStart(logs, trackingSince)` from `src/lib/periods.js`.
- Produces:
  - `localDayKey(ts: number) -> 'YYYY-MM-DD'`
  - `getStreak(logs, createdAt, now = Date.now()) -> { slippedToday: boolean, days: number }`. `days` is 0 when `slippedToday`.
  - `notificationMessage(streak) -> { title: 'HMT', body: string }`
  - `bannerMessage(streak, habit: string) -> string`

- [ ] **Step 1: Create the branch**

Run: `git checkout feature/weekly-limit && git checkout -b feature/reminders`
Expected: `Switched to a new branch 'feature/reminders'`.

- [ ] **Step 2: Write the failing tests** (local dates; today is Mon Nov 2, 2026, 20:00)

```js
const NOW = new Date(2026, 10, 2, 20).getTime();
const at = (m, d, h = 12, min = 0) => new Date(2026, m, d, h, min).getTime();
test('localDayKey pads', () => expect(localDayKey(at(0, 5))).toBe('2026-01-05'));
test('last slip Oct 30 → 3 clean days', () =>
  expect(getStreak([{ timestamp: at(9, 30) }], at(0, 1), NOW)).toEqual({ slippedToday: false, days: 3 }));
test('slip today', () =>
  expect(getStreak([{ timestamp: at(10, 2, 0, 0) }], at(0, 1), NOW)).toEqual({ slippedToday: true, days: 0 }));
test('slip 23:59 yesterday keeps today clean', () =>
  expect(getStreak([{ timestamp: at(10, 1, 23, 59) }], at(0, 1), NOW)).toEqual({ slippedToday: false, days: 1 }));
test('no logs, created today → 1', () => expect(getStreak([], at(10, 2, 9), NOW).days).toBe(1));
test('no logs, created Oct 31 → 3', () => expect(getStreak([], at(9, 31), NOW).days).toBe(3));
test('across DST fall-back (Nov 1 2026, America/New_York)', () =>
  expect(getStreak([{ timestamp: at(9, 30) }], at(0, 1), at(10, 3, 20)).days).toBe(4));
test('notification never names the habit and rotates', () => {
  expect(notificationMessage({ slippedToday: true, days: 0 })).toEqual({ title: 'HMT', body: 'You slipped today. Tomorrow is a fresh day 1.' });
  expect(notificationMessage({ slippedToday: false, days: 1 }).body).toBe("1 clean day. Don't break it tonight.");
  expect(notificationMessage({ slippedToday: false, days: 2 }).body).toBe("Day 2. You're stronger than the urge.");
  expect(notificationMessage({ slippedToday: false, days: 3 }).body).toBe('3 clean days. Keep going.');
  expect(notificationMessage({ slippedToday: false, days: 4 }).body).toBe("4 clean days. Don't break it tonight.");
});
test('banner names the habit with plurals', () => {
  expect(bannerMessage({ slippedToday: false, days: 1 }, 'smoking')).toBe('1 day without smoking. Keep going.');
  expect(bannerMessage({ slippedToday: false, days: 2 }, 'smoking')).toBe('2 days without smoking. Keep going.');
  expect(bannerMessage({ slippedToday: true, days: 0 }, 'smoking')).toBe('You slipped today. Tomorrow is a fresh day 1 without smoking.');
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: the `streak.test.js` tests FAIL because the module is missing.

- [ ] **Step 4: Implement `src/lib/streak.js`**

Count days by stepping through calendar dates with `new Date(y, m, d + 1)`, never by dividing milliseconds. The streak start is the later of the day after the last log and the local midnight of `getTrackingStart`. `days` = calendar days from the start through today, inclusive.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

`git add src/lib/streak.js src/lib/streak.test.js && git commit -m "feat: clean-day streak and reminder messages"`

---

### Task 2: Prefs store and one-time install prompt

**Files:**
- Create: `src/lib/prefs.js`, `src/lib/prefs.test.js`
- Create: `src/lib/install.js`, `src/lib/install.test.js`
- Create: `src/components/InstallPrompt.jsx`
- Modify: `src/App.jsx` (pass `isIosSafari` and `canInstall` down; move UA detection into `install.js`)
- Modify: `src/components/Dashboard.jsx` (render `InstallPrompt`)
- Modify: `package.json` (dev dependency `fake-indexeddb`)

**Interfaces:**
- Consumes: `initDB` from `src/lib/db.js`; `promptInstall()` from `src/lib/pwa.js`.
- Produces:
  - `getPrefs() -> Promise<Prefs>` (defaults merged in)
  - `updatePrefs(patch) -> Promise<Prefs>`
  - `isIosSafari(userAgent) -> boolean`
  - `shouldShowInstallPrompt({ isInstalled, canInstall, iosSafari, prefs }) -> boolean`
  - `<InstallPrompt iosSafari onInstall onDone />`

- [ ] **Step 1: Write the failing tests**

`prefs.test.js` starts with `import 'fake-indexeddb/auto'`:

```js
test('defaults when nothing saved', async () =>
  expect(await getPrefs()).toEqual({ installPromptShown: false, reminderPromptShown: false, reminderEnabled: false, lastReminderDay: null }));
test('updatePrefs merges and persists', async () => {
  await updatePrefs({ installPromptShown: true });
  expect((await getPrefs()).installPromptShown).toBe(true);
  expect((await getPrefs()).reminderEnabled).toBe(false);
});
test('prefs do not touch the profile', async () => {
  await saveUser({ username: 'a' }); await updatePrefs({ reminderEnabled: true });
  expect(await getUser()).toEqual({ username: 'a' });
});
```

`install.test.js`:

```js
const base = { isInstalled: false, canInstall: true, iosSafari: false, prefs: { installPromptShown: false } };
test('shows once when installable', () => expect(shouldShowInstallPrompt(base)).toBe(true));
test('never after shown', () => expect(shouldShowInstallPrompt({ ...base, prefs: { installPromptShown: true } })).toBe(false));
test('never when installed', () => expect(shouldShowInstallPrompt({ ...base, isInstalled: true })).toBe(false));
test('iOS Safari without install event', () => expect(shouldShowInstallPrompt({ ...base, canInstall: false, iosSafari: true })).toBe(true));
test('waits for install event elsewhere', () => expect(shouldShowInstallPrompt({ ...base, canInstall: false })).toBe(false));
test('isIosSafari', () => {
  expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe(true);
  expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1')).toBe(false);
});
```

- [ ] **Step 2: Run the tests**

Run: `npm i -D fake-indexeddb && npm test`
Expected: the new tests FAIL because the modules are missing.

- [ ] **Step 3: Implement `prefs.js` and `install.js`**

Store prefs with `db.put('user', merged, 'prefs')`.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Add `InstallPrompt` and wire it into the Dashboard**

- Render it as a `.panel` card fixed near the bottom, using the existing button styles.
- Android/desktop: the title is "Install HMT", with buttons **Install** (calls `onInstall`) and **Not now**.
- iOS: the same title, the text `Tap Share, then "Add to Home Screen".`, and an **OK** button.
- In Dashboard: load `getPrefs()` on mount. 1.5 s after mount, show the card if `shouldShowInstallPrompt(...)` is true.
- Re-check when `canInstall` changes, because the install event can arrive late.
- Every close calls `updatePrefs({ installPromptShown: true })`.

- [ ] **Step 6: Build and commit**

Run: `npm run build && npm test`
Expected: both succeed.

`git add -A src package.json package-lock.json && git commit -m "feat: one-time install prompt"`

---

### Task 3: Fingerprint unlock

**Files:**
- Create: `src/lib/biometric.js`, `src/lib/biometric.test.js`
- Modify: `src/components/AuthUnlock.jsx`
- Modify: `src/components/MenuSheet.jsx` (switch row)
- Modify: `src/components/Dashboard.jsx` (enable/disable handlers; PIN change clears `biometricCredentialId`)
- Modify: `README.md` (state the screen-lock-only limit)

**Interfaces:**
- Consumes: `getUser`/`saveUser` from `db.js`.
- Produces:
  - `toBase64Url(ArrayBuffer) -> string` and `fromBase64Url(string) -> Uint8Array`
  - `isBiometricAvailable() -> Promise<boolean>` (false when `PublicKeyCredential` is missing)
  - `registerBiometric(username) -> Promise<string | null>` (credential id, or null when cancelled or failed)
  - `verifyBiometric(credentialId) -> Promise<boolean>` (never throws)

- [ ] **Step 1: Write the failing tests**

Stub `globalThis.navigator.credentials` and `globalThis.PublicKeyCredential` per test, and restore them in `afterEach`.

```js
test('base64url round trip', () => {
  const bytes = new Uint8Array([0, 251, 255, 62, 63]);
  expect(Array.from(fromBase64Url(toBase64Url(bytes.buffer)))).toEqual(Array.from(bytes));
  expect(toBase64Url(bytes.buffer)).not.toMatch(/[+/=]/);
});
test('unavailable without PublicKeyCredential', async () => expect(await isBiometricAvailable()).toBe(false));
test('register returns id and asks for platform + user verification', async () => {
  let opts; stubCredentials({ create: async (o) => { opts = o; return { rawId: new Uint8Array([1, 2, 3]).buffer }; } });
  expect(await registerBiometric('Sandip')).toBe(toBase64Url(new Uint8Array([1, 2, 3]).buffer));
  expect(opts.publicKey.authenticatorSelection).toMatchObject({ authenticatorAttachment: 'platform', userVerification: 'required' });
});
test('register cancelled → null', async () => {
  stubCredentials({ create: async () => { throw new DOMException('x', 'NotAllowedError'); } });
  expect(await registerBiometric('a')).toBeNull();
});
test('verify true on success, false on any error', async () => {
  stubCredentials({ get: async () => ({ id: 'x' }) }); expect(await verifyBiometric('AQID')).toBe(true);
  stubCredentials({ get: async () => { throw new DOMException('x', 'NotAllowedError'); } }); expect(await verifyBiometric('AQID')).toBe(false);
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: the `biometric.test.js` tests FAIL.

- [ ] **Step 3: Implement `biometric.js`**

- Use `crypto.getRandomValues` for the challenge and the user id.
- `pubKeyCredParams`: `[{type:'public-key',alg:-7},{type:'public-key',alg:-257}]`.
- `rp: { name: 'HMT' }`, with no id, so it defaults to the current host.
- `residentKey: 'discouraged'`.
- `verifyBiometric` uses `allowCredentials: [{ type: 'public-key', id: fromBase64Url(id) }]` and `userVerification: 'required'`.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Wire up the UI**

- **AuthUnlock:** if `user.biometricCredentialId` is set, call `verifyBiometric` once on mount. Show a **"Use fingerprint"** button under the PIN pad that calls it again.
  - On `true`, save `failedAttempts: 0` and call `onUnlock()`.
  - On `false`, do nothing, with no error message.
- **MenuSheet:** add a row "Unlock with fingerprint" with the subtitle "Use your phone's fingerprint or face unlock". The trailing text shows On or Off. Show the row only when `biometricAvailable` is true.
- **Dashboard:**
  - On mount, `isBiometricAvailable()` sets the `biometricAvailable` state.
  - Toggling on calls `registerBiometric(user.username)`. If it returns an id, save it on the profile. If it returns null, show `dialog.alert({ title: 'Fingerprint not set up', message: 'Nothing was changed.' })`.
  - Toggling off deletes the field.
  - `handleSaveSettings` deletes `biometricCredentialId` when the PIN changes.
- **README:** add the line `Fingerprint unlock is a screen lock like the PIN; your logs are not encrypted.`

- [ ] **Step 6: Build and commit**

Run: `npm run build && npm test`
Expected: both succeed.

`git add -A src README.md && git commit -m "feat: optional fingerprint unlock"`

---

### Task 4: Custom service worker (injectManifest)

**Files:**
- Create: `src/sw.js`
- Modify: `vite.config.js` (VitePWA `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.js'`, `injectManifest: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] }`; remove the `workbox` block)

**Interfaces:**
- Produces: a service worker at `dist/sw.js` that precaches the app, serves `index.html` for navigations, and updates silently. Task 5 adds the reminder handlers to this file.

- [ ] **Step 1: Write `src/sw.js`**

It does the following:
- `precacheAndRoute(self.__WB_MANIFEST)`
- `cleanupOutdatedCaches()`
- `registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))`
- `self.skipWaiting()` on `install`
- `clients.claim()` on `activate`
- a `message` handler that calls `skipWaiting` when it receives `{type:'SKIP_WAITING'}`

- [ ] **Step 2: Build and inspect the output**

Run: `npm run build && grep -c "index.html" dist/sw.js && grep -o "__WB_MANIFEST" dist/sw.js | wc -l`
Expected: the build succeeds, `index.html` appears in `dist/sw.js` (count ≥ 1), and `__WB_MANIFEST` has been replaced (count 0).

- [ ] **Step 3: Run the tests and commit**

Run: `npm test`
Expected: PASS.

`git add vite.config.js src/sw.js && git commit -m "build: custom service worker with silent updates"`

---

### Task 5: Evening reminder (background + card + menu switch + banner)

**Files:**
- Create: `src/lib/reminder.js`, `src/lib/reminder.test.js`
- Create: `src/components/ReminderCard.jsx`, `src/components/StreakBanner.jsx`
- Modify: `src/sw.js` (`periodicsync`, `notificationclick`)
- Modify: `src/components/Dashboard.jsx`, `src/components/MenuSheet.jsx`, `README.md`

**Interfaces:**
- Consumes: `getStreak`, `notificationMessage`, `bannerMessage`, `localDayKey` (Task 1); `getPrefs`/`updatePrefs` (Task 2).
- Produces:
  - `decideReminder({ now, prefs, profile, logs, permission }) -> null | { title, body, dayKey }`
  - `isReminderSupported(registration, isInstalled) -> boolean`
  - `shouldShowReminderCard({ supported, permission, prefs }) -> boolean`
  - `enableReminder({ requestPermission, registration }) -> Promise<'enabled'|'denied'|'unsupported'>`. On success it registers the `daily-reminder` tag and saves `reminderEnabled: true`.
  - `disableReminder(registration) -> Promise<void>`. It unregisters the tag and saves `reminderEnabled: false`.

- [ ] **Step 1: Write the failing tests**

Today is Nov 2, 2026. `profile` is `{ createdAt: Jan 1 }`, `prefs` has the reminder on, and `permission` is `'granted'`.

```js
test('shows after 15:00 once per day', () => {
  expect(decideReminder({ ...ok, now: at(10, 2, 15, 0) })).toMatchObject({ title: 'HMT', dayKey: '2026-11-02' });
  expect(decideReminder({ ...ok, now: at(10, 2, 14, 59) })).toBeNull();
  expect(decideReminder({ ...ok, now: at(10, 2, 20), prefs: { ...ok.prefs, lastReminderDay: '2026-11-02' } })).toBeNull();
});
test('off, no permission, or wiped → nothing', () => {
  expect(decideReminder({ ...ok, prefs: { ...ok.prefs, reminderEnabled: false } })).toBeNull();
  expect(decideReminder({ ...ok, permission: 'default' })).toBeNull();
  expect(decideReminder({ ...ok, profile: null })).toBeNull();
});
test('body never contains the habit', () => {
  const r = decideReminder({ ...ok, profile: { ...ok.profile, guiltyPleasure: 'smoking' }, now: at(10, 2, 20) });
  expect(r.body).not.toMatch(/smoking/i);
});
test('support needs periodicSync and installed', () => {
  expect(isReminderSupported({ periodicSync: {} }, true)).toBe(true);
  expect(isReminderSupported({ periodicSync: {} }, false)).toBe(false);
  expect(isReminderSupported({}, true)).toBe(false);
});
test('card shows once while permission undecided', () => {
  expect(shouldShowReminderCard({ supported: true, permission: 'default', prefs: { reminderPromptShown: false } })).toBe(true);
  expect(shouldShowReminderCard({ supported: true, permission: 'default', prefs: { reminderPromptShown: true } })).toBe(false);
  expect(shouldShowReminderCard({ supported: true, permission: 'denied', prefs: { reminderPromptShown: false } })).toBe(false);
});
test('enableReminder registers on grant, not on deny', async () => {
  const tags = []; const reg = { periodicSync: { register: async (t, o) => tags.push([t, o.minInterval]) } };
  expect(await enableReminder({ requestPermission: async () => 'granted', registration: reg })).toBe('enabled');
  expect(tags).toEqual([['daily-reminder', 3600000]]);
  expect((await getPrefs()).reminderEnabled).toBe(true);
  expect(await enableReminder({ requestPermission: async () => 'denied', registration: reg })).toBe('denied');
});
```

`reminder.test.js` imports `fake-indexeddb/auto`.

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: the `reminder.test.js` tests FAIL.

- [ ] **Step 3: Implement `reminder.js`**

Run them again with `npm test`. Expected: PASS.

- [ ] **Step 4: Add the service worker handlers**

- `periodicsync`, with tag `daily-reminder`, does all of this inside `event.waitUntil`:
  - read `profile`, `prefs` and all logs through `initDB` (idb works in a service worker);
  - call `decideReminder` with `Notification.permission`;
  - if it returns a result, `registration.showNotification(title, { body, icon: 'pwa-192x192.png', tag: 'daily-reminder' })` and then `updatePrefs({ lastReminderDay: dayKey })`.
- `notificationclick` closes the notification, then focuses an existing window or opens `./`.

- [ ] **Step 5: UI**

- **StreakBanner:** a small `.glass` pill under the header with `bannerMessage(getStreak(logs, user.createdAt, now), user.guiltyPleasure)`. It's shown to everyone.
- **ReminderCard:** the title "Get an evening reminder?" and the text "A short nudge each evening. It never says what you're tracking." It has two buttons:
  - **Turn on** calls `enableReminder`, then marks `reminderPromptShown`.
  - **No thanks** marks `reminderPromptShown`.
  - Show it after unlock when `shouldShowReminderCard` is true. Never show it in the same session as the install prompt.
- **MenuSheet:** the row "Evening reminder", subtitle "A daily nudge in the evening", trailing On/Off. When not supported but the browser has `periodicSync`, the subtitle reads "Install the app to get an evening reminder." When permission is `denied`, it reads "Allow notifications for this site in your browser settings."

- [ ] **Step 6: Build, run the tests and check the output**

Run: `npm run build && npm test && grep -c "daily-reminder" dist/sw.js`
Expected: the build succeeds, the tests pass, and the count is ≥ 1.

- [ ] **Step 7: README and commit**

Add a README section: an evening reminder (Android Chrome/Edge, installed, after 3 pm, never names the habit), plus an in-app streak banner.

`git add -A src README.md && git commit -m "feat: evening reminder with clean-day streak"`
