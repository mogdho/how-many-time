import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { hashPIN as hashPINUtil } from '../lib/security';
import { saveUser as saveUserDB } from '../lib/db';

const AuthSetup = ({ onComplete }) => {
    const [username, setUsername] = useState('');
    const [guiltyPleasure, setGuiltyPleasure] = useState('');
    const [monthlyLimit, setMonthlyLimit] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    const handleSetup = async (event) => {
        event.preventDefault();

        if (pin.length !== 4) {
            setError('PIN must be 4 digits');
            return;
        }

        if (pin !== confirmPin) {
            setError('PINs do not match');
            return;
        }

        const pinHash = await hashPINUtil(pin);

        await saveUserDB({
            username,
            pinHash,
            failedAttempts: 0,
            guiltyPleasure: guiltyPleasure || 'Guilty Pleasure',
            monthlyLimit: monthlyLimit ? parseInt(monthlyLimit, 10) : null,
        });

        onComplete();
    };

    return (
        <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="auth-shell"
        >
            <div className="auth-shell__ambient" />

            <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="auth-stage"
            >
                <div className="auth-copy">
                    <div className="auth-copy__pill">
                        <Sparkles size={14} />
                        <span>Premium local-first ritual</span>
                    </div>

                    <p className="auth-copy__eyebrow">Create your vault</p>
                    <h1 className="auth-copy__title">
                        A deeply private tracker with a more cinematic surface.
                    </h1>
                    <p className="auth-copy__text">
                        Everything lives on this device. No accounts, no cloud sync, no audience.
                    </p>

                    <div className="auth-copy__features">
                        <div className="auth-feature">
                            <LockKeyhole size={18} />
                            <span>PIN-locked access</span>
                        </div>
                        <div className="auth-feature">
                            <Sparkles size={18} />
                            <span>Offline-ready PWA</span>
                        </div>
                    </div>
                </div>

                <motion.form
                    onSubmit={handleSetup}
                    className="auth-card"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.45 }}
                >
                    <div className="auth-card__header">
                        <p className="auth-card__eyebrow">New profile</p>
                        <h2 className="auth-card__title">Set the rules</h2>
                    </div>

                    <div>
                        <label className="auth-label">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            className="auth-input"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="auth-label">What are you tracking?</label>
                        <input
                            type="text"
                            value={guiltyPleasure}
                            onChange={(event) => setGuiltyPleasure(event.target.value)}
                            className="auth-input"
                            placeholder="Smoking, drinking, sugar, scrolling"
                        />
                    </div>

                    <div>
                        <label className="auth-label">Monthly limit</label>
                        <input
                            type="number"
                            min="1"
                            value={monthlyLimit}
                            onChange={(event) => setMonthlyLimit(event.target.value)}
                            className="auth-input"
                            placeholder="10"
                            required
                        />
                    </div>

                    <div>
                        <label className="auth-label">4-digit PIN</label>
                        <input
                            type="password"
                            maxLength={4}
                            pattern="\d{4}"
                            value={pin}
                            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="auth-input auth-input--pin"
                            required
                        />
                    </div>

                    <div>
                        <label className="auth-label">Confirm PIN</label>
                        <input
                            type="password"
                            maxLength={4}
                            pattern="\d{4}"
                            value={confirmPin}
                            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="auth-input auth-input--pin"
                            required
                        />
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="auth-primary-button">
                        Enter the private ledger
                    </button>
                </motion.form>
            </motion.div>
        </motion.section>
    );
};

export default AuthSetup;
