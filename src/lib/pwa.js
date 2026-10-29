import { registerSW } from 'virtual:pwa-register';

const pwaState = {
    isOfflineReady: false,
    isUpdateAvailable: false,
    canInstall: false,
};

const listeners = new Set();

let updateServiceWorker;
let installPromptEvent = null;

// Catch the browser's install event as early as possible (before React renders),
// otherwise a fast page load can fire it before anyone is listening.
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        installPromptEvent = e;
        pwaState.canInstall = true;
        emitPwaState();
    });
    window.addEventListener('appinstalled', () => {
        installPromptEvent = null;
        pwaState.canInstall = false;
        emitPwaState();
    });
}

// Shows the native install dialog. Returns true if the user accepted.
export async function promptInstall() {
    if (!installPromptEvent) {
        return false;
    }
    const event = installPromptEvent;
    // The browser only allows prompt() once per event
    installPromptEvent = null;
    pwaState.canInstall = false;
    emitPwaState();

    event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
}

function emitPwaState() {
    const nextState = { ...pwaState };
    listeners.forEach((listener) => listener(nextState));
}

export function getPwaState() {
    return { ...pwaState };
}

export function subscribeToPwaState(listener) {
    listeners.add(listener);
    listener(getPwaState());

    return () => {
        listeners.delete(listener);
    };
}

export function registerPwa() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    updateServiceWorker = registerSW({
        immediate: true,
        onOfflineReady() {
            pwaState.isOfflineReady = true;
            emitPwaState();
        },
        onNeedRefresh() {
            pwaState.isUpdateAvailable = true;
            emitPwaState();
        },
        onRegisterError(error) {
            console.error('[HMT] Service worker registration failed.', error);
        },
    });
}

export async function applyPwaUpdate() {
    if (!updateServiceWorker) {
        return false;
    }

    await updateServiceWorker(true);
    pwaState.isUpdateAvailable = false;
    emitPwaState();

    return true;
}
