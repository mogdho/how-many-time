import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPIN } from '../lib/security';
import { getUser, saveUser, wipeData } from '../lib/db';

const AuthUnlock = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [username, setUsername] = useState('');
    const [storedHash, setStoredHash] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            const user = await getUser();
            if (user) {
                setUsername(user.username);
                setStoredHash(user.pinHash);
                setAttempts(user.failedAttempts || 0);
            }
        };
        loadUser();
    }, []);

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (pin.length !== 4) return;

        const isValid = await verifyPIN(pin, storedHash);
        if (isValid) {
            const user = await getUser();
            await saveUser({ ...user, failedAttempts: 0 });
            onUnlock();
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPin('');

            const user = await getUser();
            await saveUser({ ...user, failedAttempts: newAttempts });

            if (newAttempts >= 10) {
                await wipeData();
                window.location.reload();
            } else if (newAttempts >= 7) {
                setError(`Warning: ${10 - newAttempts} attempts left before complete wipe.`);
            } else {
                setError('Incorrect PIN');
            }
        }
    };

    const inputRef = useRef(null);

    const handleFocus = () => {
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
            onClick={handleFocus}
        >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="premium-card flex flex-col items-center"
            >
                <div className="mb-12">
                    <p className="text-[#888888] uppercase tracking-[0.2em] mb-2">Private Access for</p>
                    <h1 className="text-4xl font-semibold text-[#EAEAEA]">{username}</h1>
                </div>

                <form onSubmit={handleUnlock} className="w-full">
                    <motion.div
                        className="relative flex justify-center gap-4 mb-12 cursor-text"
                        animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        onClick={handleFocus}
                    >
                        {/* Off-screen Input for PIN capture */}
                        <input
                            ref={inputRef}
                            type="tel"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setPin(val);
                            }}
                            autoComplete="off"
                            className="absolute opacity-0 pointer-events-none"
                            style={{ left: '-10000px', top: 'auto', width: '1px', height: '1px' }}
                            autoFocus
                            required
                        />

                        {/* Visual Slots */}
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`pin-slot ${pin.length === i ? 'pin-slot-active' : ''}`}
                            >
                                {pin.length > i ? '•' : ''}
                            </div>
                        ))}
                    </motion.div>

                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`text-sm mb-8 ${attempts >= 7 ? 'text-red-500 font-bold' : 'text-[#CF6679]'}`}
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <motion.button
                        type="submit"
                        whileHover={{
                            scale: 1.02,
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            boxShadow: "0 0 20px rgba(255, 255, 255, 0.05)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full glass py-4 rounded-xl font-bold text-whitesmoke text-lg transition-all duration-300"
                    >
                        UNLOCK
                    </motion.button>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default AuthUnlock;
