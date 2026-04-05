import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveLog, getLogs, deleteLastLog, getUser, wipeData } from '../lib/db';
import HeroCount from './HeroCount';
import ActionButton from './ActionButton';
import WeeklyChart from './WeeklyChart';
import { Trash2 } from 'lucide-react';

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

    return (
        <div className="min-h-screen flex flex-col items-center pb-6 md:pb-20 bg-gradient-to-br from-[#3852AF] to-[#5a7bcc] bg-diagonal-stripes">
            <header className="header-sticky w-full flex justify-center !p-4 md:!p-6 z-50">
                <div className="max-w-6xl w-full flex justify-center items-center px-2 md:px-12">
                    <div className="profile-card !bg-[#EFBC7E] !text-[#3852AF] !px-4 !py-2 md:!px-6 md:!py-3">
                        <span className="font-bold tracking-tighter text-xs md:text-lg uppercase italic">
                            {username}'s Log
                        </span>
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
                                <WeeklyChart logs={logs} mode="historical" />
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
        </div>
    );
};

export default Dashboard;
