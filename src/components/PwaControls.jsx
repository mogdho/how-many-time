import React from 'react';
import { CheckCircle2, Download, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';

const PwaControls = ({
    canInstall,
    isInstalled,
    isOfflineReady,
    isOnline,
    isUpdateAvailable,
    onInstall,
    onUpdate,
}) => {
    const shouldRender =
        !isOnline ||
        isOfflineReady ||
        isUpdateAvailable ||
        isInstalled ||
        (!isInstalled && canInstall);

    if (!shouldRender) {
        return null;
    }

    return (
        <section className="pwa-panel glass-card" aria-label="App status">
            <div className="pwa-panel__copy">
                <span className="pwa-panel__eyebrow">Progressive Web App</span>
                <h2 className="pwa-panel__title">Ready for install, offline use, and smooth updates.</h2>
                <p className="pwa-panel__text">
                    Your data stays local on this device. When the app is installed, it opens like a native app and keeps working even without a connection.
                </p>
            </div>

            <div className="pwa-panel__actions">
                {!isOnline && (
                    <div className="pwa-chip pwa-chip--warning">
                        <WifiOff size={16} />
                        <span>Offline now. Local logging still works.</span>
                    </div>
                )}

                {isOnline && isOfflineReady && (
                    <div className="pwa-chip pwa-chip--success">
                        <ShieldCheck size={16} />
                        <span>Offline cache is ready.</span>
                    </div>
                )}

                {isInstalled && (
                    <div className="pwa-chip">
                        <CheckCircle2 size={16} />
                        <span>Installed mode is active.</span>
                    </div>
                )}

                {!isInstalled && canInstall && (
                    <button type="button" className="pwa-action" onClick={onInstall}>
                        <Download size={16} />
                        <span>Install app</span>
                    </button>
                )}

                {isUpdateAvailable && (
                    <button type="button" className="pwa-action pwa-action--secondary" onClick={onUpdate}>
                        <RefreshCw size={16} />
                        <span>Update now</span>
                    </button>
                )}
            </div>
        </section>
    );
};

export default PwaControls;
