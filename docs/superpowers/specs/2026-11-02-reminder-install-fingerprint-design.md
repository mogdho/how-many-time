# Evening reminder, one-time install prompt, fingerprint unlock — design

## Intent and why
The user wants the app to push them to keep away from their habit, not only record slips. Three additions:
1. **Evening reminder:** a daily notification with a changing day count ("3 clean days. Keep going."). On days they slipped, the message turns to guilt. The idea is guilt that turns into motivation.
2. **One-time install prompt:** most people never find the Install row in the menu. Installing is also what makes the background reminder possible on Android.
3. **Fingerprint unlock:** a faster way to unlock than typing the PIN every time.

The app's core promise stays the same: private, local-only, no servers, no tracking.

## Goals
- An evening reminder with a day count calculated on the phone, delivered without any server.
- An in-app banner with the same message, so every user gets it, including iPhone and desktop users who can't receive background notifications.
- An install prompt that appears exactly once.
- Optional fingerprint (or Face ID / Windows Hello) unlock, with the PIN always available as a fallback.

## Non-goals
- Exact delivery at 11:30 pm. The user agreed that "some time in the evening" is good enough.
- Background notifications on iPhone or desktop. Browsers don't offer them without a server.
- Encrypting data. Fingerprint, like the PIN, is a screen lock only.
- A push server of any kind.

## Anti-goals (failure even if it "works")
- The habit's name appearing on the lock screen or in any notification.
- The install prompt or the notification-permission card appearing more than once.
- The day count in the notification disagreeing with the day count in the app.
- Fingerprint making the 10-wrong-PIN wipe easier to get around, or counting toward it.

## Constraints
- No server. Everything is computed on the device from IndexedDB.
- The background reminder relies on **Periodic Background Sync**. That works only in Chrome/Edge on Android, only when the app is installed, and the browser decides how often it runs (roughly daily at best).
- Notification permission must be requested from a user tap.
- WebAuthn (fingerprint) requires HTTPS, which GitHub Pages provides, and a platform authenticator.
- Existing users' data must keep working. Add new keys to the existing `user` store; don't bump the DB version.

## Approaches (for the background reminder code)
- **A. Custom service worker (chosen).** Switch vite-plugin-pwa from `generateSW` to `injectManifest` with our own `src/sw.js`. Workbox precaching is kept. The service worker imports the same day-count and message code as the app, so the numbers can't drift apart.
- B. Keep `generateSW` and attach an extra script with `importScripts`. This was rejected because the extra script can't share code, so the counting logic would be duplicated.
- C. A push server for an exact-time delivery. This was rejected because the user chose no server.

The user chose **A**. The build order is install prompt, then fingerprint, then reminder.

## Decisions the user made
- An evening reminder at any time is fine. It doesn't need to be 11:30 pm sharp. The delivery window is **15:00–23:59**, chosen to make daily delivery likely.
- **A clean day means zero slips** that day. Staying under the limit doesn't make it clean.
- **The lock screen stays vague:** "3 clean days. Keep going." The habit is named only inside the app.
- Notification permission is asked **straight after install**: the first time the app opens as an installed app.
- The install prompt is shown **once**. If it's ignored or dismissed, it never shows again.
- Fingerprint unlock is wanted where the phone supports it.
- Approach A.

## How it behaves

### Day count (shared by the notification and the banner)
- **Slipped today** (at least one log since today's local midnight): the message is a slip message, and there's no count.
- **Otherwise,** the clean streak is the number of calendar days from the streak start through today, inclusive. The streak start is the later of these two:
  - the day after the most recent log;
  - the day the profile was created (`createdAt`, falling back to the first log as `getTrackingStart` already does).
- Example: last slip Oct 30, today is Nov 2 with no slips → the count is 3 (Oct 31, Nov 1, Nov 2).
- Days are calendar days, built from dates rather than by adding 24 hours, the same as in `periods.js`.

### Messages
- **Notification title:** "HMT". The habit is never included.
- **Notification body:**
  - Clean: rotate through a few lines based on the count, e.g. "{n} clean day(s). Keep going.", "{n} clean day(s). Don't break it tonight.", "Day {n}. You're stronger than the urge."
  - Slip: "You slipped today. Tomorrow is a fresh day 1."
- **In-app banner** (inside the app after unlock, so it can name the habit):
  - Clean: "{n} day(s) without {habit}. Keep going."
  - Slip: "You slipped today. Tomorrow is a fresh day 1 without {habit}."
- Use correct singular and plural forms ("1 clean day", "2 clean days").

### Evening reminder (background, Android only)
- The service worker handles a `periodicsync` event with tag `daily-reminder`.
- It runs only if all of these are true: the reminder is enabled, notification permission is granted, the local time is **15:00–23:59**, and no reminder has been shown today (track the last shown date). *User's choice after the builder check:* the window was widened from 18:00 because Chrome runs these checks only about every 12 hours, and a narrow window could miss every day. Runs before 15:00 do nothing, and there's no morning catch-up.
- It reads the logs and profile from IndexedDB, works out the message, and shows the notification (icon `pwa-192x192.png`, tag `daily-reminder`).
- Tapping the notification focuses or opens the app, which then asks for the PIN or fingerprint as usual.
- Register with `registration.periodicSync.register('daily-reminder', { minInterval: 60 * 60 * 1000 })`. The browser will raise this; a short minimum gives it more chances to fall inside the evening window.
- When the reminder is turned off, unregister the tag.

### "Get an evening reminder?" card (asked straight after install)
- It appears once, on the first unlock where **all** of these are true: the app is running installed (standalone), Periodic Background Sync is supported, notification permission is still `default`, and the card has never been shown.
- **Turn on:** request permission. If granted, enable the reminder and register the sync. Any outcome counts as "shown".
- **No thanks** or closing it: mark it as shown and never show it again.
- On devices without Periodic Background Sync (iPhone, desktop), the card never appears.

### Menu: "Evening reminder" switch
- Shown only where Periodic Background Sync is supported. Its subtitle is "A daily nudge in the evening".
- Turning it on when permission isn't granted yet requests permission. If permission is denied, the switch stays off and the subtitle says to allow notifications in the browser settings.

### In-app banner
- Shown on the Dashboard to every user, at the top under the name tag. It's small and fits the existing glass/panel style.
- It updates live, using the Dashboard's existing `now` refresh and its logs. After tapping GUILTY it switches to the slip message.

### One-time install prompt
- It appears once, a moment after unlocking the Dashboard, when the app is **not** installed and either the browser can install it (`canInstall`) or the device is iPhone/iPad Safari.
- **Android/desktop:** **Install** calls the existing `promptInstall()`. **Not now** dismisses it.
- **iPhone:** the same card, showing the "Share → Add to Home Screen" steps and an **OK** button.
- Every way of closing it marks it as shown for good. The menu's Install row stays as it is.
- If the browser's install event arrives late, wait for it. Don't mark the prompt as shown until it has actually appeared.

### Fingerprint unlock
- In the menu: an **"Unlock with fingerprint"** switch, shown only when `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` is true.
- **Turning it on:** `navigator.credentials.create` with a platform authenticator, `userVerification: 'required'`, a random challenge and a random user id. Save the credential id in the profile. If it fails or is cancelled, the switch stays off.
- **Unlock screen when it's on:** try `navigator.credentials.get` (with `allowCredentials` set to the saved id and `userVerification: 'required'`) as soon as the screen appears. If the browser blocks it because there was no user tap, show a **"Use fingerprint"** button. Success unlocks. Cancelling or failing leaves the PIN pad in place.
- Fingerprint failures **don't** change `failedAttempts`. The PIN wipe rules are unchanged.
- **Turned off automatically** when the PIN is changed in settings. A wipe removes it along with everything else.
- **Honest limit (write this in the README):** without a server, the result can't be checked cryptographically, so this is a screen lock of the same strength as the PIN, not encryption.

### Storage (new keys in the existing `user` store, no DB version change)
- `profile` gains `biometricCredentialId` (base64url string, or missing).
- A new `prefs` record: `{ installPromptShown, reminderPromptShown, reminderEnabled, lastReminderDay }`.
  - It's kept separate from the profile so the service worker never rewrites the profile.
  - `lastReminderDay` is a local date string, `YYYY-MM-DD`.
- Panic wipe and the 10-wrong-PIN wipe clear both, as they already do for the whole store.

## Calls made by Claude after the builder check (user can override)
- **Where the reminder is offered:** wherever `registration.periodicSync` exists **and** the app is running installed (standalone). That includes installed desktop Chrome/Edge. In a normal browser tab, the reminder card is never shown, and the menu switch is replaced by the note "Install the app to get an evening reminder."
- **App updates stay silent and automatic, as they are today** (`registerType: 'autoUpdate'`). `sw.js` calls `skipWaiting()` and `clientsClaim()` on install. It also handles a `SKIP_WAITING` message so the existing "Update app" row still works if it ever appears.
- **A successful fingerprint unlock resets `failedAttempts` to 0, the same as a correct PIN.** Only someone with an enrolled fingerprint can pass, so this doesn't help an attacker. Fingerprint is still offered during the warning stage (7 or more wrong PINs).

## Left to the builder
- Exact visual design of the cards, banner and switches, using existing tokens (`.glass`, `.panel`, `.btn`, `useDialog` style).
- The rotating message list, keeping the tone above. Unit-test the selection logic and the plurals.
- Where the new code lives. A suggested split: `src/lib/streak.js` (day count + messages, shared with the service worker), `src/lib/prefs.js`, `src/lib/biometric.js`, `src/sw.js`.
- Re-checking offline mode and the "Update app" flow after switching to `injectManifest`. The existing `registerSW` update prompt needs the service worker to handle a `SKIP_WAITING` message.
- Branch: start from `feature/weekly-limit`, which isn't merged yet, so the work builds on the weekly-limit code.

## How it will be verified
- Unit tests (Vitest) for the day count and the message selection, including the cases: slipped today, first day after setup, a log exactly at midnight, and DST.
- I can't run a browser in this environment, so the user does the device checks on an Android phone with Chrome, using the deployed or `npm run preview` build:
  - install prompt once;
  - permission card once;
  - DevTools → Application → Periodic background sync → trigger `daily-reminder` after 15:00;
  - fingerprint on and off;
  - offline mode still works.
