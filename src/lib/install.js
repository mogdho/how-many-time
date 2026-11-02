// When to show the one-time install prompt.

export const isIosSafari = (userAgent) =>
    /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

// iPhone Safari never fires an install event, so it gets the "Add to Home Screen" steps instead.
// Everywhere else, wait until the browser says the app can be installed.
export const shouldShowInstallPrompt = ({ isInstalled, canInstall, iosSafari, prefs }) =>
    Boolean(prefs) && !prefs.installPromptShown && !isInstalled && (canInstall || iosSafari);
