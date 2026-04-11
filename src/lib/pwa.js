import { registerSW } from 'virtual:pwa-register';

const pwaState = {
    isOfflineReady: false,
    isUpdateAvailable: false,
};

const listeners = new Set();

let updateServiceWorker;

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
