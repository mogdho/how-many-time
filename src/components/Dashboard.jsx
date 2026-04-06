import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveLog, getLogs, deleteLastLog, getUser, saveUser, wipeData } from '../lib/db';
import { hashPIN } from '../lib/security';
import HeroCount from './HeroCount';
import ActionButton from './ActionButton';
import WeeklyChart from './WeeklyChart';
import { Trash2 } from 'lucide-react';

const Dashboard = ({ deferredPrompt, onInstallClick }) => {
    const [logs, setLogs] = useState([]);
    const [user, setUser] = useState(null);
    const [showUndo, setShowUndo] = useState(false);
    const [undoTimer, setUndoTimer] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Settings form state
    const [editUsername, setEditUsername] = useState('');
    const [editGuiltyPleasure, setEditGuiltyPleasure] = useState('');
    const [editMonthlyLimit, setEditMonthlyLimit] = useState('');
    const [editPin, setEditPin] = useState('');
    const [editConfirmPin, setEditConfirmPin] = useState('');
    const [settingsError, setSettingsError] = useState('');
    const [settingsSuccess, setSettingsSuccess] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const fetchedUser = await getUser();
            if (fetchedUser) setUser(fetchedUser);
            const allLogs = await getLogs();
            setLogs(allLogs);
        };
        loadData();
    }, []);

    const handleAddLog = async () => {
        // Vibrate must be called synchronously within a user interaction
        if ('vibrate' in navigator) {
            const result = navigator.vibrate(200);
            console.log('[HMT] navigator.vibrate(200) called, result:', result);
        } else {
            console.log('[HMT] navigator.vibrate not supported on this device/browser');
        }
        
        const newLogId = await saveLog(Date.now());
        const allLogs = await getLogs();
        setLogs(allLogs);

        // Undo logic
        setShowUndo(true);
        setUndoTimer(10);
    };

    const handleUndo = async () => {
        await deleteLastLog();
        const allLogs = await getLogs();
        setLogs(allLogs);
        setShowUndo(false);
    };

    useEffect(() => {
        let interval;
        if (showUndo && undoTimer > 0) {
            interval = setInterval(() => {
                setUndoTimer(t => t - 1);
            }, 1000);
        } else if (undoTimer === 0) {
            setShowUndo(false);
        }
        return () => clearInterval(interval);
    }, [showUndo, undoTimer]);

    const openSettings = () => {
        setEditUsername(user?.username || '');
        setEditGuiltyPleasure(user?.guiltyPleasure || '');
        setEditMonthlyLimit(user?.monthlyLimit ? String(user.monthlyLimit) : '');
        setEditPin('');
        setEditConfirmPin('');
        setSettingsError('');
        setSettingsSuccess('');
        setShowSettings(true);
        setMenuOpen(false);
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSettingsError('');
        setSettingsSuccess('');

        // Build updated user object
        const updatedUser = { ...user };

        if (editUsername.trim()) updatedUser.username = editUsername.trim();
        updatedUser.guiltyPleasure = editGuiltyPleasure.trim() || 'Guilty Pleasure';
        updatedUser.monthlyLimit = editMonthlyLimit ? parseInt(editMonthlyLimit, 10) : user?.monthlyLimit;

        // If PIN fields are filled, update the PIN
        if (editPin || editConfirmPin) {
            if (editPin.length !== 4) {
                setSettingsError('PIN must be 4 digits');
                return;
            }
            if (editPin !== editConfirmPin) {
                setSettingsError('PINs do not match');
                return;
            }
            updatedUser.pinHash = await hashPIN(editPin);
        }

        updatedUser.failedAttempts = 0;
        await saveUser(updatedUser);
        setUser(updatedUser);
        setSettingsSuccess('Saved!');
        setTimeout(() => setShowSettings(false), 800);
    };

    // Close menu when clicking outside
    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = () => setMenuOpen(false);
        // Delay so the opening click doesn't immediately close it
        const timer = setTimeout(() => window.addEventListener('click', handleClick), 10);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', handleClick);
        };
    }, [menuOpen]);

    const currentMonthCount = logs.filter(l => {
        const d = new Date(l.timestamp);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const isOverLimit = user?.monthlyLimit && currentMonthCount >= user.monthlyLimit;

    const basePath = import.meta.env.BASE_URL || '/';

    return (
        <div className="min-h-screen flex flex-col items-center pb-6 md:pb-20 animated-bg bg-diagonal-stripes">
            <header className="header-sticky w-full flex justify-center !p-4 md:!p-6 z-50">
                <div className="max-w-6xl w-full flex justify-between items-center px-2 md:px-12">
                    {/* Spacer for centering */}
                    <div style={{ width: 36 }} />

                    <div className="profile-card !bg-[#EFBC7E] !text-[#3852AF] !px-4 !py-2 md:!px-6 md:!py-3 flex flex-col items-center">
                        <span className="font-bold tracking-tighter text-xs md:text-lg uppercase italic text-center">
                            {user?.username}'s {user?.guiltyPleasure ? `${user.guiltyPleasure} LOG` : 'LOG'}
                        </span>
                    </div>

                    {/* Hamburger Menu */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                            }}
                        >
                            <img src={`${basePath}menu.png`} alt="Menu" style={{ width: 28, height: 28, filter: 'brightness(1.2)' }} />
                        </button>

                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: 8,
                                        background: 'rgba(10, 10, 20, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 16,
                                        padding: '8px 0',
                                        minWidth: 200,
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                                        zIndex: 999,
                                    }}
                                >
                                    <button
                                            onClick={() => {
                                                if (deferredPrompt) {
                                                    onInstallClick();
                                                } else {
                                                    alert('App is already installed, or install is not available in this browser.');
                                                }
                                                setMenuOpen(false);
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                width: '100%',
                                                padding: '12px 20px',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#fff',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.05em',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <img src={`${basePath}download.png`} alt="" style={{ width: 18, height: 18 }} />
                                            Install App
                                        </button>
                                    <button
                                        onClick={openSettings}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            width: '100%',
                                            padding: '12px 20px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.05em',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <img src={`${basePath}gear.png`} alt="" style={{ width: 18, height: 18 }} />
                                        Change Credentials
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center w-full px-4 md:px-6 text-center justify-between">
                <div className="max-w-6xl w-full flex flex-col items-center justify-between flex-grow">

                    {/* Centered Button Area via Flex-Grow */}
                    <div className="flex-grow flex flex-col justify-center items-center w-full min-h-[35vh]">
                        <div className="scale-75 md:scale-100">
                            <ActionButton onClick={handleAddLog} isGuilty={showUndo} />
                        </div>
                    </div>

                    {/* Stacked Charts */}
                    <div className="flex flex-col w-full gap-8 md:gap-12 mt-8 md:mt-12">
                        {/* Historical Chart */}
                        <section className="flex flex-col items-center border-t border-white/10 pt-8 mt-4">
                            <header className="w-full text-center mb-6 md:mb-12">
                                <h2 className="text-[10px] uppercase font-bold tracking-[0.4em] opacity-60 text-white">Monthly Fault</h2>
                            </header>
                            <div className="w-full">
                                <WeeklyChart logs={logs} mode="historical" monthlyLimit={user?.monthlyLimit} />
                            </div>
                        </section>

                        {/* This Week Chart */}
                        <section className="flex flex-col items-center border-t border-white/10 pt-8 mt-4">
                            <header className="w-full text-center mb-6 md:mb-12">
                                <h2 className="text-[10px] uppercase font-bold tracking-[0.4em] opacity-60 text-white">Seven-days slip</h2>
                            </header>
                            <div className="w-full">
                                <WeeklyChart logs={logs} mode="current" />
                            </div>
                        </section>
                    </div>

                    <footer className="pt-12 md:pt-20 pb-4 md:pb-16 flex flex-col items-center gap-6 md:gap-8 mt-auto">
                        <button
                            onClick={async () => {
                                if (confirm("Wipe all data permanently?")) {
                                    await wipeData();
                                    window.location.reload();
                                }
                            }}
                            className="text-white/40 hover:text-white transition-all text-xs font-bold flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent hover:border-white/20"
                        >
                            <Trash2 size={14} /> PANIC WIPE
                        </button>
                        <p className="text-white/30 text-[9px] md:text-[11px] uppercase tracking-[0.2em] font-black">Private App / Local Only / No Tracking</p>
                    </footer>
                </div>
            </main>

            {/* Undo Button */}
            <AnimatePresence>
                {showUndo && (
                    <div style={{
                        position: 'fixed',
                        bottom: '5rem',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        zIndex: 1000,
                        pointerEvents: 'none',
                    }}>
                        <motion.button
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            onClick={handleUndo}
                            style={{
                                background: '#2f6b3f',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '1.25rem 4rem',
                                fontSize: '1.5rem',
                                fontWeight: 900,
                                letterSpacing: '0.15em',
                                cursor: 'pointer',
                                boxShadow: '0 20px 50px rgba(47, 107, 63, 0.6)',
                                pointerEvents: 'auto',
                            }}
                        >
                            UNDO
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(12px)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                        }}
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'rgba(20, 20, 30, 0.98)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 24,
                                padding: '2rem',
                                width: '100%',
                                maxWidth: 380,
                                maxHeight: '90vh',
                                overflowY: 'auto',
                            }}
                        >
                            <h2 style={{
                                color: '#EAEAEA',
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                marginBottom: '1.5rem',
                                textAlign: 'center',
                                letterSpacing: '0.05em',
                            }}>
                                Change Credentials
                            </h2>

                            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Username</label>
                                    <input
                                        type="text"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                        className="auth-input"
                                        style={{ fontSize: '1rem' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Guilty Pleasure</label>
                                    <input
                                        type="text"
                                        value={editGuiltyPleasure}
                                        onChange={(e) => setEditGuiltyPleasure(e.target.value)}
                                        className="auth-input"
                                        style={{ fontSize: '1rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Monthly Limit</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editMonthlyLimit}
                                        onChange={(e) => setEditMonthlyLimit(e.target.value)}
                                        className="auth-input"
                                        style={{ fontSize: '1rem' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>New PIN (leave blank to keep)</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        value={editPin}
                                        onChange={(e) => setEditPin(e.target.value)}
                                        className="auth-input"
                                        style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5em' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Confirm New PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        value={editConfirmPin}
                                        onChange={(e) => setEditConfirmPin(e.target.value)}
                                        className="auth-input"
                                        style={{ fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5em' }}
                                    />
                                </div>

                                {settingsError && <p style={{ color: '#CF6679', fontSize: '0.8rem', textAlign: 'center' }}>{settingsError}</p>}
                                {settingsSuccess && <p style={{ color: '#4caf50', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 }}>{settingsSuccess}</p>}

                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowSettings(false)}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: 12,
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            background: 'transparent',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: 12,
                                            border: 'none',
                                            background: '#008080',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        SAVE
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;

