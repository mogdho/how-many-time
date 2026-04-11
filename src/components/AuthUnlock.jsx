import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { verifyPIN } from '../lib/security';
import { getUser, saveUser, wipeData } from '../lib/db';

const AuthUnlock = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [username, setUsername] = useState('');
    const [storedHash, setStoredHash] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

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

    const handleUnlock = async (event) => {
        event.preventDefault();

        if (pin.length !== 4) {
            return;
        }

        const isValid = await verifyPIN(pin, storedHash);

        if (isValid) {
            const user = await getUser();
            await saveUser({ ...user, failedAttempts: 0 });
            onUnlock();
            return;
        }

        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPin('');

        const user = await getUser();
        await saveUser({ ...user, failedAttempts: nextAttempts });

        if (nextAttempts >= 10) {
            await wipeData();
            window.location.reload();
            return;
        }

        if (nextAttempts >= 7) {
            setError(`Warning: ${10 - nextAttempts} attempts left before complete wipe.`);
            return;
        }

        setError('Incorrect PIN');
    };

    const handleFocus = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="auth-shell"
            onClick={handleFocus}
        >
            <div className="auth-shell__ambient" />

            <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="auth-stage auth-stage--narrow"
            >
                <div className="auth-copy auth-copy--centered">
                    <div className="auth-copy__pill">
                        <ShieldCheck size={14} />
                        <span>Encrypted on this device</span>
                    </div>

                    <p className="auth-copy__eyebrow">Welcome back</p>
                    <h1 className="auth-copy__title auth-copy__title--tight">{username || 'Private user'}</h1>
                    <p className="auth-copy__text">
                        Re-enter your vault and continue tracking without sending a byte anywhere else.
                    </p>
                </div>

                <motion.form
                    onSubmit={handleUnlock}
                    className="auth-card auth-card--compact"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.12, duration: 0.4 }}
                >
                    <div className="auth-card__header">
                        <p className="auth-card__eyebrow">Secure entry</p>
                        <h2 className="auth-card__title">Unlock</h2>
                    </div>

                    <motion.div
                        className="pin-grid"
                        animate={error ? { x: [-8, 8, -6, 6, 0] } : {}}
                        transition={{ duration: 0.35 }}
                        onClick={handleFocus}
                    >
                        <input
                            ref={inputRef}
                            type="tel"
                            maxLength={4}
                            value={pin}
                            onChange={(event) => {
                                const nextValue = event.target.value.replace(/\D/g, '').slice(0, 4);
                                setPin(nextValue);
                            }}
                            autoComplete="off"
                            className="auth-hidden-input"
                            autoFocus
                            required
                        />

                        {[0, 1, 2, 3].map((slot) => (
                            <div
                                key={slot}
                                className={`pin-slot ${pin.length === slot ? 'pin-slot-active' : ''} ${pin.length > slot ? 'pin-slot-filled' : ''}`}
                            >
                                {pin.length > slot ? '•' : ''}
                            </div>
                        ))}
                    </motion.div>

                    <div className="auth-alert-row">
                        <div className="auth-alert-chip">
                            <LockKeyhole size={14} />
                            <span>{10 - attempts} attempts before wipe</span>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`auth-error ${attempts >= 7 ? 'auth-error--strong' : ''}`}
                            >
                                {attempts >= 7 && <AlertTriangle size={14} />}
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <button type="submit" className="auth-primary-button">
                        Unlock vault
                    </button>
                </motion.form>
            </motion.div>
        </motion.section>
    );
};

export default AuthUnlock;
