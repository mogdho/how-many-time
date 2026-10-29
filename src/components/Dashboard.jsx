import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveLog, getLogs, deleteLastLog, getUser, saveUser, wipeData } from '../lib/db';
import { hashPIN } from '../lib/security';
import HeroCount from './HeroCount';
import ActionButton from './ActionButton';
import WeeklyChart from './WeeklyChart';
import { Trash2, WifiOff, ShieldCheck, Menu } from 'lucide-react';
import MenuSheet from './MenuSheet';
import { useDialog } from './DialogProvider';

const Dashboard = ({
    canInstall,
    installHelp,
    isInstalled,
    isOfflineReady,
    isOnline,
    isUpdateAvailable,
    onInstallClick,
    onUpdateClick,
}) => {
    const dialog = useDialog();
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

    const closeMenu = useCallback(() => setMenuOpen(false), []);

    const currentMonthCount = logs.filter(l => {
        const d = new Date(l.timestamp);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const isOverLimit = user?.monthlyLimit && currentMonthCount >= user.monthlyLimit;

    return (
        <div className="min-h-screen flex flex-col items-center">
            <header className="header-sticky flex justify-center px-4 py-3 md:py-5">
                <div className="max-w-6xl w-full flex justify-between items-center gap-3 md:px-12">
                    {/* Spacer keeps the name tag centered */}
                    <div className="w-11 shrink-0" />

                    <div className="profile-card px-4 py-2 md:px-6 md:py-3 min-w-0">
                        <span className="font-extrabold tracking-tight text-xs md:text-base uppercase italic text-center leading-tight break-words pr-[0.15em]">
                            {user?.username}'s {user?.guiltyPleasure ? `${user.guiltyPleasure} log` : 'log'}
                        </span>
                    </div>

                    {/* Menu button (opens the bottom sheet) */}
                    <button
                        onClick={() => setMenuOpen(true)}
                        className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-transparent hover:bg-white/10 active:bg-white/15 transition-colors"
                        aria-label="Open menu"
                        aria-haspopup="dialog"
                        aria-expanded={menuOpen}
                    >
                        <Menu className="w-7 h-7 text-peach" strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center w-full px-4 md:px-6 text-center">
                <div className="max-w-3xl w-full flex flex-col items-center flex-grow">

                    {/* Main button */}
                    <div className="flex flex-col justify-center items-center w-full min-h-[42vh] py-6">
                        <div className="scale-90 md:scale-100">
                            <ActionButton onClick={handleAddLog} isGuilty={showUndo} />
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="flex flex-col w-full gap-10 md:gap-12">
                        <section className="flex flex-col items-center gap-5">
                            <h2 className="section-title">Monthly fault</h2>
                            <WeeklyChart logs={logs} mode="historical" monthlyLimit={user?.monthlyLimit} trackingSince={user?.createdAt} />
                        </section>

                        <section className="flex flex-col items-center gap-5">
                            <h2 className="section-title">Seven-day slip</h2>
                            <WeeklyChart logs={logs} mode="current" trackingSince={user?.createdAt} />
                        </section>
                    </div>

                    <footer className="pt-14 pb-28 flex flex-col items-center gap-5 mt-auto">
                        <button
                            onClick={async () => {
                                const ok = await dialog.confirm({
                                    title: 'Wipe everything?',
                                    message: 'This permanently deletes all your logs, your name and your PIN from this device. It can’t be undone.',
                                    confirmText: 'Wipe',
                                    danger: true,
                                });
                                if (ok) {
                                    await wipeData();
                                    window.location.reload();
                                }
                            }}
                            className="btn btn-ghost text-muted hover:text-white hover:!border-crimson hover:!bg-crimson/20 !text-xs !py-2.5 !px-4"
                        >
                            <Trash2 size={14} /> Panic wipe
                        </button>
                        <p className="text-white/40 text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold">
                            Private app · Local only · No tracking
                        </p>
                    </footer>
                </div>
            </main>

            {/* PWA status pill (offline / offline-ready) */}
            <AnimatePresence>
                {(!isOnline || isOfflineReady) && (
                    <motion.div
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className={`panel fixed top-20 inset-x-0 mx-auto w-fit flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold tracking-wider whitespace-nowrap pointer-events-none z-[998] ${isOnline ? 'text-peach' : 'text-text'}`}
                        role="status"
                    >
                        {isOnline ? <ShieldCheck size={14} /> : <WifiOff size={14} />}
                        {isOnline ? 'READY TO WORK OFFLINE' : 'OFFLINE · LOGGING STILL WORKS'}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Undo Button */}
            <AnimatePresence>
                {showUndo && (
                    <div className="fixed inset-x-0 bottom-6 flex justify-center z-[1000] pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                        <motion.button
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            onClick={handleUndo}
                            className="btn btn-secondary pointer-events-auto !text-base !px-10 !py-4 !rounded-2xl"
                        >
                            Undo
                            <span className="opacity-60 font-bold tabular-nums">{undoTimer}s</span>
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>

            <MenuSheet
                open={menuOpen}
                onClose={closeMenu}
                user={user}
                monthCount={currentMonthCount}
                isUpdateAvailable={isUpdateAvailable}
                onUpdate={onUpdateClick}
                isInstalled={isInstalled}
                canInstall={canInstall}
                installHelp={installHelp}
                onInstall={onInstallClick}
                onOpenSettings={openSettings}
                onLock={() => window.location.reload()}
            />

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-md"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="panel rounded-3xl p-7 w-full max-w-sm max-h-[90vh] overflow-y-auto"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="settings-title"
                        >
                            <h2 id="settings-title" className="font-display italic uppercase text-xl tracking-wider text-center mb-6">
                                Change Credentials
                            </h2>

                            <form onSubmit={handleSaveSettings} className="flex flex-col gap-5">
                                <div>
                                    <label className="field-label" htmlFor="edit-username">Your name</label>
                                    <input
                                        id="edit-username"
                                        type="text"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                        className="auth-input text-base"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="field-label" htmlFor="edit-pleasure">Guilty pleasure</label>
                                    <input
                                        id="edit-pleasure"
                                        type="text"
                                        value={editGuiltyPleasure}
                                        onChange={(e) => setEditGuiltyPleasure(e.target.value)}
                                        className="auth-input text-base"
                                    />
                                </div>
                                <div>
                                    <label className="field-label" htmlFor="edit-limit">Monthly limit</label>
                                    <input
                                        id="edit-limit"
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        value={editMonthlyLimit}
                                        onChange={(e) => setEditMonthlyLimit(e.target.value)}
                                        className="auth-input text-base"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="field-label" htmlFor="edit-pin">New PIN</label>
                                        <input
                                            id="edit-pin"
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            pattern="\d{4}"
                                            value={editPin}
                                            onChange={(e) => setEditPin(e.target.value)}
                                            className="auth-input text-center text-2xl tracking-[0.5em]"
                                        />
                                    </div>
                                    <div>
                                        <label className="field-label" htmlFor="edit-confirm">Confirm</label>
                                        <input
                                            id="edit-confirm"
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            pattern="\d{4}"
                                            value={editConfirmPin}
                                            onChange={(e) => setEditConfirmPin(e.target.value)}
                                            className="auth-input text-center text-2xl tracking-[0.5em]"
                                        />
                                    </div>
                                </div>
                                <p className="text-muted text-xs -mt-2 text-left">Leave the PIN fields empty to keep your current PIN.</p>

                                {settingsError && <p className="form-error text-center" role="alert">{settingsError}</p>}
                                {settingsSuccess && <p className="form-success text-center" role="status">{settingsSuccess}</p>}

                                <div className="flex gap-3 mt-2">
                                    <button type="button" onClick={() => setShowSettings(false)} className="btn btn-ghost flex-1">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary flex-1">
                                        Save
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
