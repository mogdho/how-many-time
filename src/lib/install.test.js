import { test, expect } from 'vitest';
import { shouldShowInstallPrompt, isIosSafari } from './install';

const base = { isInstalled: false, canInstall: true, iosSafari: false, prefs: { installPromptShown: false } };

test('shows once when installable', () => expect(shouldShowInstallPrompt(base)).toBe(true));
test('never after shown', () => expect(shouldShowInstallPrompt({ ...base, prefs: { installPromptShown: true } })).toBe(false));
test('never when installed', () => expect(shouldShowInstallPrompt({ ...base, isInstalled: true })).toBe(false));
test('iOS Safari without install event', () => expect(shouldShowInstallPrompt({ ...base, canInstall: false, iosSafari: true })).toBe(true));
test('waits for install event elsewhere', () => expect(shouldShowInstallPrompt({ ...base, canInstall: false })).toBe(false));
test('waits while prefs are loading', () => expect(shouldShowInstallPrompt({ ...base, prefs: null })).toBe(false));

test('isIosSafari', () => {
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe(true);
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isIosSafari('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36')).toBe(false);
});
