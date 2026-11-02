import { test, expect } from 'vitest';
import { pickPrompt } from './prompts';

const base = {
    isInstalled: false, canInstall: true, iosSafari: false,
    prefs: { installPromptShown: false, reminderPromptShown: false },
    reminderSupported: false, permission: 'default', showUndo: false,
};

test('install first, then reminder', () => {
    expect(pickPrompt(base)).toBe('install');
    expect(pickPrompt({ ...base, isInstalled: true, reminderSupported: true })).toBe('reminder');
    expect(pickPrompt({ ...base, isInstalled: true })).toBeNull();
});

test('never covers the Undo button', () => {
    expect(pickPrompt({ ...base, showUndo: true })).toBeNull();
    expect(pickPrompt({ ...base, isInstalled: true, reminderSupported: true, showUndo: true })).toBeNull();
});
