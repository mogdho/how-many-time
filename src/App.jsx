import React, { useState, useEffect } from 'react';
import { getUser } from './lib/db';
import { applyPwaUpdate, getPwaState, promptInstall, subscribeToPwaState } from './lib/pwa';
import AuthSetup from './components/AuthSetup';
import AuthUnlock from './components/AuthUnlock';
import Dashboard from './components/Dashboard';
import './App.css';

function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Tells the user how to install when the browser doesn't give us an install prompt.
function getInstallHelp() {
    const userAgent = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|Edg|OPR/.test(userAgent);
    const isChromium = /Chrome|CriOS|Edg/.test(userAgent);

    if (isIos && isSafari) {
        return 'On iPhone/iPad: tap Share, then "Add to Home Screen".';
    }
    if (isAndroid && isChromium) {
        return 'Open the browser menu and choose "Install app" (site must be on HTTPS).';
    }
    if (isChromium) {
        return 'Open the browser menu and choose "Install app".';
    }
    return 'This browser may not support installing. Try Chrome, Edge, or Safari.';
}

function App() {
    const [appState, setAppState] = useState('LOADING');
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

        const handleInstallStateChange = () => setIsInstalled(isStandaloneMode());
        const handleAppInstalled = () => setIsInstalled(true);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('appinstalled', handleAppInstalled);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleInstallStateChange);
        } else {
            mediaQuery.addListener(handleInstallStateChange);
        }

        return () => {
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

    // Show the "ready to work offline" notice for a few seconds.
    useEffect(() => {
        if (!pwaState.isOfflineReady) return undefined;
        setShowOfflineReady(true);
        const timer = window.setTimeout(() => setShowOfflineReady(false), 5000);
        return () => window.clearTimeout(timer);
    }, [pwaState.isOfflineReady]);

    if (appState === 'LOADING') return <div className="animated-bg min-h-screen" />;

    return (
        <div className="animated-bg bg-diagonal-stripes min-h-screen text-text">
            {appState === 'SETUP' && <AuthSetup onComplete={() => setAppState('DASHBOARD')} />}
            {appState === 'UNLOCK' && <AuthUnlock onUnlock={() => setAppState('DASHBOARD')} />}
            {appState === 'DASHBOARD' && (
                <Dashboard
                    canInstall={pwaState.canInstall}
                    installHelp={getInstallHelp()}
                    isInstalled={isInstalled}
                    isOfflineReady={showOfflineReady}
                    isOnline={isOnline}
                    isUpdateAvailable={pwaState.isUpdateAvailable}
                    onInstallClick={promptInstall}
                    onUpdateClick={applyPwaUpdate}
                />
            )}
        </div>
    );
}

export default App;
