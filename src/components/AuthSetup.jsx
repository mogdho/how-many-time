import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { hashPIN as hashPINUtil } from '../lib/security';
import { saveUser as saveUserDB } from '../lib/db';

const AuthSetup = ({ onComplete }) => {
    const [username, setUsername] = useState('');
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
        await saveUserDB({ username, pinHash, failedAttempts: 0 });
        onComplete();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
        >
            <h1 className="text-4xl font-semibold mb-8 text-[#EAEAEA]">Welcome</h1>
            <form onSubmit={handleSetup} className="glass p-8 rounded-2xl w-full max-w-sm space-y-6">
                <div>
                    <label className="block text-sm text-[#888888] mb-2 uppercase tracking-widest">Username (Display Only)</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="auth-input text-xl"
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm text-[#888888] mb-2 uppercase tracking-widest">4-Digit PIN</label>
                    <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="auth-input text-center text-3xl tracking-[1em]"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm text-[#888888] mb-2 uppercase tracking-widest">Confirm PIN</label>
                    <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="auth-input text-center text-3xl tracking-[1em]"
                        required
                    />
                </div>
                {error && <p className="text-[#CF6679] text-sm">{error}</p>}
                <button
                    type="submit"
                    className="w-full bg-[#008080] text-white py-4 rounded-xl font-semibold active:scale-95 transition-transform"
                >
                    START LOGGING
                </button>
            </form>
        </motion.div>
    );
};

export default AuthSetup;
