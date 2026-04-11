import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Download, RefreshCw, Settings2, Shield, Sparkles, Trash2 } from 'lucide-react';
import { saveLog, getLogs, deleteLastLog, getUser, saveUser, wipeData } from '../lib/db';
import { hashPIN } from '../lib/security';
import ActionButton from './ActionButton';
import HeroCount from './HeroCount';
import PwaControls from './PwaControls';
import WeeklyChart from './WeeklyChart';

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
    const [logs, setLogs] = useState([]);
    const [user, setUser] = useState(null);
    const [showUndo, setShowUndo] = useState(false);
    const [undoTimer, setUndoTimer] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

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
            if (fetchedUser) {
                setUser(fetchedUser);
            }

            const allLogs = await getLogs();
            setLogs(allLogs);
        };

        loadData();
    }, []);

    const handleAddLog = async () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(180);
        }

        await saveLog(Date.now());
        const allLogs = await getLogs();
        setLogs(allLogs);
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
            interval = window.setInterval(() => {
                setUndoTimer((value) => value - 1);
            }, 1000);
        } else if (undoTimer === 0) {
            setShowUndo(false);
        }

        return () => window.clearInterval(interval);
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

    const handleSaveSettings = async (event) => {
        event.preventDefault();
        setSettingsError('');
        setSettingsSuccess('');

        const updatedUser = { ...user };

        if (editUsername.trim()) {
            updatedUser.username = editUsername.trim();
        }

        updatedUser.guiltyPleasure = editGuiltyPleasure.trim() || 'Guilty Pleasure';
        updatedUser.monthlyLimit = editMonthlyLimit ? parseInt(editMonthlyLimit, 10) : user?.monthlyLimit;

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
        setSettingsSuccess('Saved');
        window.setTimeout(() => setShowSettings(false), 900);
    };

    useEffect(() => {
        if (!menuOpen) {
            return undefined;
        }

        const handleClick = () => setMenuOpen(false);
        const timer = window.setTimeout(() => window.addEventListener('click', handleClick), 10);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('click', handleClick);
        };
    }, [menuOpen]);

    const currentMonthCount = logs.filter((log) => {
        const date = new Date(log.timestamp);
        const now = new Date();

        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const totalCount = logs.length;
    const monthlyLimit = user?.monthlyLimit || 0;
    const remainingThisMonth = monthlyLimit ? Math.max(monthlyLimit - currentMonthCount, 0) : null;
    const usageRatio = monthlyLimit ? Math.min(currentMonthCount / monthlyLimit, 1) : 0;
    const usageWidth = `${Math.max(usageRatio * 100, totalCount > 0 ? 8 : 0)}%`;
    const isOverLimit = monthlyLimit ? currentMonthCount >= monthlyLimit : false;
    const basePath = import.meta.env.BASE_URL || '/';

    return (
        <div className="dashboard-shell">
            <div className="dashboard-noise" />

            <header className="dashboard-header">
                <div className="dashboard-header__inner">
                    <div className="dashboard-brand">
                        <span className="dashboard-brand__mark">
                            <Sparkles size={14} />
                        </span>
                        <div>
                            <p className="dashboard-brand__eyebrow">Private Ledger</p>
                            <h1 className="dashboard-brand__title">How Many Times</h1>
                        </div>
                    </div>

                    <div className="dashboard-header__actions">
                        <div className="dashboard-status">
                            <span className={`dashboard-status__dot ${isOnline ? 'is-online' : 'is-offline'}`} />
                            {isOnline ? 'Online' : 'Offline'}
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                className="dashboard-menu-button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setMenuOpen((value) => !value);
                                }}
                            >
                                <img src={`${basePath}menu.png`} alt="Menu" style={{ width: 22, height: 22 }} />
                            </button>

                            <AnimatePresence>
                                {menuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                        transition={{ duration: 0.18 }}
                                        className="dashboard-menu"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        {isUpdateAvailable && (
                                            <button
                                                type="button"
                                                className="dashboard-menu__item"
                                                onClick={() => {
                                                    onUpdateClick();
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                <RefreshCw size={16} />
                                                Update App
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="dashboard-menu__item"
                                            onClick={() => {
                                                if (canInstall) {
                                                    onInstallClick();
                                                } else if (isInstalled) {
                                                    window.alert('The app is already installed on this device.');
                                                } else {
                                                    window.alert(installHelp?.message || 'Install is not available in this browser yet.');
                                                }

                                                setMenuOpen(false);
                                            }}
                                        >
                                            {canInstall ? <Download size={16} /> : <img src={`${basePath}download.png`} alt="" style={{ width: 16, height: 16 }} />}
                                            {isInstalled ? 'Installed' : 'Install App'}
                                        </button>

                                        <button type="button" className="dashboard-menu__item" onClick={openSettings}>
                                            <Settings2 size={16} />
                                            Change Credentials
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <section className="hero-panel">
                    <div className="hero-panel__intro">
                        <div className="hero-panel__intro-card">
                            <div className="hero-panel__pill">
                                <Crown size={14} />
                                <span>Members-only feeling, zero cloud dependency</span>
                            </div>

                            <p className="hero-panel__kicker">
                                {user?.username || 'Private user'}
                            </p>

                            <h2 className="hero-panel__title">
                                {user?.guiltyPleasure || 'Private Log'}
                                <span> tracked with brutal honesty and polished restraint.</span>
                            </h2>

                            <p className="hero-panel__text">
                                A local-first ritual dashboard with a premium surface, instant logging, and no analytics watching over your shoulder.
                            </p>

                            <div className="hero-glance-grid">
                                <article className="hero-glance-card">
                                    <span className="hero-glance-card__label">Monthly pulse</span>
                                    <strong className="hero-glance-card__value">{currentMonthCount}</strong>
                                    <span className="hero-glance-card__hint">
                                        {isOverLimit ? 'Pressure is elevated' : 'Quietly in control'}
                                    </span>
                                </article>

                                <article className="hero-glance-card hero-glance-card--accent">
                                    <span className="hero-glance-card__label">Remaining runway</span>
                                    <strong className="hero-glance-card__value">
                                        {monthlyLimit ? remainingThisMonth : 'Open'}
                                    </strong>
                                    <span className="hero-glance-card__hint">
                                        {monthlyLimit ? 'entries left this month' : 'no cap configured'}
                                    </span>
                                </article>
                            </div>
                        </div>

                        <PwaControls
                            canInstall={canInstall}
                            installHelp={installHelp}
                            isInstalled={isInstalled}
                            isOfflineReady={isOfflineReady}
                            isOnline={isOnline}
                            isUpdateAvailable={isUpdateAvailable}
                            onInstall={onInstallClick}
                            onUpdate={onUpdateClick}
                        />
                    </div>

                    <div className="hero-panel__metrics glass-card">
                        <div className="hero-panel__count">
                            <HeroCount count={totalCount} />
                        </div>

                        <div className="hero-metrics-grid">
                            <article className="metric-card">
                                <span className="metric-card__label">This month</span>
                                <strong className="metric-card__value">{currentMonthCount}</strong>
                                <span className="metric-card__hint">
                                    {isOverLimit ? 'Above your limit' : 'Within your limit'}
                                </span>
                            </article>

                            <article className="metric-card">
                                <span className="metric-card__label">Monthly cap</span>
                                <strong className="metric-card__value">{monthlyLimit || 'Open'}</strong>
                                <span className="metric-card__hint">
                                    {monthlyLimit ? `${remainingThisMonth} left this month` : 'No limit set'}
                                </span>
                            </article>
                        </div>

                        {monthlyLimit > 0 && (
                            <div className="usage-meter">
                                <div className="usage-meter__copy">
                                    <span>Monthly pressure</span>
                                    <span>{currentMonthCount} / {monthlyLimit}</span>
                                </div>

                                <div className="usage-meter__track">
                                    <div
                                        className={`usage-meter__fill ${isOverLimit ? 'is-over' : ''}`}
                                        style={{ width: usageWidth }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="hero-panel__cta">
                            <ActionButton onClick={handleAddLog} isGuilty={showUndo || isOverLimit} />
                            <p className="hero-panel__cta-note">
                                One tap. Instant write. Local only.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="dashboard-marquee">
                    <div className="dashboard-marquee__line" />
                    <p className="dashboard-marquee__text">
                        Private ritual dashboard. Cinematic surface. Zero sync. Device-only memory.
                    </p>
                    <div className="dashboard-marquee__line" />
                </section>

                <section className="dashboard-grid">
                    <article className="chart-shell">
                        <div className="chart-shell__header">
                            <div>
                                <p className="chart-shell__eyebrow">Monthly archive</p>
                                <h3 className="chart-shell__title">Pattern over time</h3>
                            </div>
                            <span className="chart-shell__badge">
                                <Shield size={14} />
                                Stored on-device
                            </span>
                        </div>

                        <WeeklyChart logs={logs} mode="historical" monthlyLimit={user?.monthlyLimit} />
                    </article>

                    <article className="chart-shell">
                        <div className="chart-shell__header">
                            <div>
                                <p className="chart-shell__eyebrow">Seven-day rhythm</p>
                                <h3 className="chart-shell__title">This week vs last week</h3>
                            </div>
                            <span className="chart-shell__badge">
                                <Sparkles size={14} />
                                Live from your taps
                            </span>
                        </div>

                        <WeeklyChart logs={logs} mode="current" />
                    </article>
                </section>

                <footer className="dashboard-footer">
                    <p className="dashboard-footer__text">
                        Private app. Local storage only. No tracking. No sync. No observers.
                    </p>

                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('Wipe all data permanently?')) {
                                await wipeData();
                                window.location.reload();
                            }
                        }}
                        className="dashboard-danger"
                    >
                        <Trash2 size={14} />
                        Panic Wipe
                    </button>
                </footer>
            </main>

            <AnimatePresence>
                {showUndo && (
                    <motion.div
                        initial={{ opacity: 0, y: 36 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 36 }}
                        className="undo-toast"
                    >
                        <div>
                            <p className="undo-toast__title">Entry captured</p>
                            <p className="undo-toast__text">Undo available for {undoTimer}s</p>
                        </div>

                        <button type="button" className="undo-toast__button" onClick={handleUndo}>
                            Undo
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="settings-backdrop"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.96 }}
                            className="settings-modal"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <p className="settings-modal__eyebrow">Personal vault</p>
                            <h2 className="settings-modal__title">Refine your private setup</h2>

                            <form onSubmit={handleSaveSettings} className="settings-form">
                                <div>
                                    <label className="settings-form__label">Username</label>
                                    <input
                                        type="text"
                                        value={editUsername}
                                        onChange={(event) => setEditUsername(event.target.value)}
                                        className="auth-input"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="settings-form__label">Guilty pleasure</label>
                                    <input
                                        type="text"
                                        value={editGuiltyPleasure}
                                        onChange={(event) => setEditGuiltyPleasure(event.target.value)}
                                        className="auth-input"
                                    />
                                </div>

                                <div>
                                    <label className="settings-form__label">Monthly limit</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editMonthlyLimit}
                                        onChange={(event) => setEditMonthlyLimit(event.target.value)}
                                        className="auth-input"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="settings-form__label">New PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        value={editPin}
                                        onChange={(event) => setEditPin(event.target.value)}
                                        className="auth-input auth-input--pin"
                                    />
                                </div>

                                <div>
                                    <label className="settings-form__label">Confirm PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        value={editConfirmPin}
                                        onChange={(event) => setEditConfirmPin(event.target.value)}
                                        className="auth-input auth-input--pin"
                                    />
                                </div>

                                {settingsError && <p className="settings-form__error">{settingsError}</p>}
                                {settingsSuccess && <p className="settings-form__success">{settingsSuccess}</p>}

                                <div className="settings-form__actions">
                                    <button type="button" className="settings-button settings-button--ghost" onClick={() => setShowSettings(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="settings-button settings-button--primary">
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
