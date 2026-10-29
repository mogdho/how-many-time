import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { hashPIN as hashPINUtil } from '../lib/security';
import { saveUser as saveUserDB } from '../lib/db';

const AuthSetup = ({ onComplete }) => {
    const [username, setUsername] = useState('');
    const [guiltyPleasure, setGuiltyPleasure] = useState('');
    const [monthlyLimit, setMonthlyLimit] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    const handleSetup = async (e) => {
        e.preventDefault();
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
            createdAt: Date.now()
        });
        onComplete();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center min-h-screen px-4 py-10 text-center"
        >
            <h1 className="font-display italic uppercase text-4xl tracking-wider text-text mb-2">Welcome</h1>
            <p className="text-muted text-sm mb-8">Set up your private log. Everything stays on this device.</p>

            <form onSubmit={handleSetup} className="glass p-7 rounded-3xl w-full max-w-sm flex flex-col gap-6">
                <div>
                    <label className="field-label" htmlFor="setup-username">Your name</label>
                    <input
                        id="setup-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="auth-input text-lg"
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label className="field-label" htmlFor="setup-pleasure">Guilty pleasure</label>
                    <input
                        id="setup-pleasure"
                        type="text"
                        value={guiltyPleasure}
                        onChange={(e) => setGuiltyPleasure(e.target.value)}
                        className="auth-input text-lg"
                        placeholder="e.g. smoking, drinking"
                    />
                </div>
                <div>
                    <label className="field-label" htmlFor="setup-limit">Monthly limit</label>
                    <input
                        id="setup-limit"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={monthlyLimit}
                        onChange={(e) => setMonthlyLimit(e.target.value)}
                        className="auth-input text-lg"
                        placeholder="e.g. 10"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="field-label" htmlFor="setup-pin">4-digit PIN</label>
                        <input
                            id="setup-pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            pattern="\d{4}"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="auth-input text-center text-2xl tracking-[0.6em]"
                            required
                        />
                    </div>
                    <div>
                        <label className="field-label" htmlFor="setup-confirm">Confirm PIN</label>
                        <input
                            id="setup-confirm"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            pattern="\d{4}"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            className="auth-input text-center text-2xl tracking-[0.6em]"
                            required
                        />
                    </div>
                </div>

                {error && <p className="form-error" role="alert">{error}</p>}

                <button type="submit" className="btn btn-primary w-full mt-2">
                    Start logging
                </button>
            </form>
        </motion.div>
    );
};

export default AuthSetup;
