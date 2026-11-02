// Which one-time card (if any) to show on the Dashboard right now.
import { shouldShowInstallPrompt } from './install';
import { shouldShowReminderCard } from './reminder';

export const pickPrompt = ({ isInstalled, canInstall, iosSafari, prefs, reminderSupported, permission, showUndo }) => {
    // Cards sit where the Undo button appears, so never cover it.
    if (showUndo) return null;
    if (shouldShowInstallPrompt({ isInstalled, canInstall, iosSafari, prefs })) return 'install';
    if (shouldShowReminderCard({ supported: reminderSupported, permission, prefs })) return 'reminder';
    return null;
};
