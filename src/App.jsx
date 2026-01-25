import React, { useState, useEffect } from 'react';
import { getUser } from './lib/db';
import AuthSetup from './components/AuthSetup';
import AuthUnlock from './components/AuthUnlock';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
    const [appState, setAppState] = useState('LOADING');

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

    if (appState === 'LOADING') return <div className="bg-black min-h-screen" />;

    return (
        <div className="bg-black min-h-screen text-white">
            {appState === 'SETUP' && <AuthSetup onComplete={() => setAppState('DASHBOARD')} />}
            {appState === 'UNLOCK' && <AuthUnlock onUnlock={() => setAppState('DASHBOARD')} />}
            {appState === 'DASHBOARD' && <Dashboard />}
        </div>
    );
}

export default App;
