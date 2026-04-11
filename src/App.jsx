import React, { useState, useEffect } from 'react';
import { getUser } from './lib/db';
import { applyPwaUpdate, getPwaState, subscribeToPwaState } from './lib/pwa';
import AuthSetup from './components/AuthSetup';
import AuthUnlock from './components/AuthUnlock';
import Dashboard from './components/Dashboard';
import './App.css';

function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function App() {
    const [appState, setAppState] = useState('LOADING');
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);
    const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
    const [pwaState, setPwaState] = useState(() => getPwaState());
    const [showOfflineReady, setShowOfflineReady] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const user = await getUser();
                if (!user) {
                    setAppState('SETUP');
                } else {
                    setAppState('UNLOCK');
                }
            } catch (e) {
                console.error("DB Error", e);
                setAppState('SETUP');
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(display-mode: standalone)');

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleInstallStateChange = () => {
            setIsInstalled(isStandaloneMode());
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            handleInstallStateChange();
        };

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleInstallStateChange);
        } else {
            mediaQuery.addListener(handleInstallStateChange);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);

            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleInstallStateChange);
            } else {
                mediaQuery.removeListener(handleInstallStateChange);
            }
        };
    }, []);

    useEffect(() => subscribeToPwaState(setPwaState), []);

    useEffect(() => {
        if (!pwaState.isOfflineReady) {
            return undefined;
        }

        setShowOfflineReady(true);

        const timer = window.setTimeout(() => {
            setShowOfflineReady(false);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [pwaState.isOfflineReady]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return false;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        return outcome === 'accepted';
    };

    const handleUpdateClick = async () => {
        await applyPwaUpdate();
    };

    if (appState === 'LOADING') {
        return <div className="app-loading-shell" />;
    }

    return (
        <div className="app-shell">
            {appState === 'SETUP' && <AuthSetup onComplete={() => setAppState('DASHBOARD')} />}
            {appState === 'UNLOCK' && <AuthUnlock onUnlock={() => setAppState('DASHBOARD')} />}
            {appState === 'DASHBOARD' && (
                <Dashboard
                    canInstall={Boolean(deferredPrompt)}
                    isInstalled={isInstalled}
                    isOfflineReady={showOfflineReady}
                    isOnline={isOnline}
                    isUpdateAvailable={pwaState.isUpdateAvailable}
                    onInstallClick={handleInstallClick}
                    onUpdateClick={handleUpdateClick}
                />
            )}
        </div>
    );
}

export default App;
