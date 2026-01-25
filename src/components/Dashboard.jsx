import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveLog, getLogs, deleteLastLog, getUser, wipeData } from '../lib/db';
import HeroCount from './HeroCount';
import ActionButton from './ActionButton';
import WeeklyChart from './WeeklyChart';
import { LogOut, Trash2 } from 'lucide-react';

const Dashboard = () => {
    const [logs, setLogs] = useState([]);
    const [username, setUsername] = useState('');
    const [showUndo, setShowUndo] = useState(false);
    const [undoTimer, setUndoTimer] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            const user = await getUser();
            if (user) setUsername(user.username);
            const allLogs = await getLogs();
            setLogs(allLogs);
        };
        loadData();
    }, []);

    const handleAddLog = async () => {
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

    const handleLogout = () => {
        window.location.reload(); // Simple reload triggers AuthUnlock
    };

    return (
        <div className="min-h-screen flex flex-col items-center pb-20">
            <header className="header-sticky w-full flex justify-center">
                <div className="max-w-6xl w-full flex justify-between items-center px-12">
                    <div className="profile-card">
                        <span className="font-bold tracking-tighter text-lg uppercase italic">
                            {username}'s Log
                        </span>
                    </div>

                    <button onClick={handleLogout} className="exit-button">
                        <span>EXIT</span>
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center w-full px-6 pt-10 text-center">
                <div className="max-w-6xl w-full flex flex-col items-center justify-center">
                    {/* Quote Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="quote-card"
                    >
                        <p className="quote-text">"Every action you take is a vote for the type of person you wish to become."</p>
                        <p className="quote-author">— James Clear</p>
                    </motion.div>

                    <div className="mb-48">
                        <ActionButton onClick={handleAddLog} />
                    </div>

                    {/* Side-by-Side Charts */}
                    <div className="grid-cols-layout w-full mt-32">
                        {/* Historical Chart */}
                        <section className="p-12 flex flex-col items-center">
                            <header className="w-full text-center mb-12">
                                <h2 className="text-[10px] uppercase font-bold tracking-[0.4em] mb-2 opacity-30 text-white">Monthly Narrative</h2>
                                <p className="text-2xl font-black tracking-tighter text-white">Historical Overview</p>
                            </header>
                            <div className="w-full">
                                <WeeklyChart logs={logs} mode="historical" />
                            </div>
                        </section>

                        {/* This Week Chart */}
                        <section className="p-12 flex flex-col items-center">
                            <header className="w-full text-center mb-12">
                                <h2 className="text-[10px] uppercase font-bold tracking-[0.4em] mb-2 opacity-30 text-white">Current Cycle</h2>
                                <p className="text-2xl font-black tracking-tighter text-white">This Week</p>
                            </header>
                            <div className="w-full">
                                <WeeklyChart logs={logs} mode="current" />
                            </div>
                        </section>
                    </div>

                    <footer className="pt-20 pb-16 flex flex-col items-center gap-8">
                        <button
                            onClick={async () => {
                                if (confirm("Wipe all data permanently?")) {
                                    await wipeData();
                                    window.location.reload();
                                }
                            }}
                            className="text-black/20 hover:text-red-600 transition-all text-xs font-bold flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent hover:border-zinc-100"
                        >
                            <Trash2 size={14} /> PANIC WIPE
                        </button>
                        <p className="text-black/10 text-[11px] uppercase tracking-[0.2em] font-black">Private App / Local Only / No Tracking</p>
                    </footer>
                </div>
            </main>

            <AnimatePresence>
                {showUndo && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 100, x: "-50%" }}
                        className="toast-popup"
                    >
                        <div className="flex flex-col text-left">
                            <span className="text-lg font-black tracking-tight text-white">Entry logged</span>
                            <span className="text-sm font-bold text-white/40">Undo available for {undoTimer}s</span>
                        </div>
                        <button
                            onClick={handleUndo}
                            className="bg-white text-black px-10 py-3 rounded-2xl text-base font-black hover:bg-zinc-200 transition-colors shadow-xl"
                        >
                            UNDO
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
