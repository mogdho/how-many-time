import React, { useState } from 'react';
import { saveUser, saveLog, wipeData } from '../lib/db';
import { hashPIN } from '../lib/security';

const DataSeeder = () => {
    const [seeding, setSeeding] = useState(false);

    const handleSeed = async () => {
        if (!confirm("This will wipe all current data and seed test data. Proceed?")) return;

        setSeeding(true);
        try {
            // 1. Wipe everything
            await wipeData();

            // 2. Create 'test' user with PIN '1234'
            const pinHash = await hashPIN('1234');
            await saveUser({ username: 'test', pinHash, failedAttempts: 0 });

            // 3. Generate 3 weeks of data (21 days)
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;

            // We'll generate a random number of logs (2-8) per day for the last 21 days
            for (let i = 0; i < 21; i++) {
                const dayStart = now - (i * dayMs);

                // Specific requirement: 3 entries on Sunday of last week (7 days ago)
                let logsPerDay;
                if (i === 7) {
                    logsPerDay = 3;
                } else {
                    logsPerDay = Math.floor(Math.random() * 7) + 2; // 2 to 8 logs
                }

                for (let j = 0; j < logsPerDay; j++) {
                    // Spread logs randomly within that 24h window
                    const randomOffset = Math.floor(Math.random() * dayMs);
                    const logTimestamp = dayStart - randomOffset;
                    await saveLog(logTimestamp);
                }
            }

            alert("Seeding complete! App will reload.");
            window.location.reload();
        } catch (error) {
            console.error("Seeding failed", error);
            alert("Seeding failed. Check console.");
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            <button
                onClick={handleSeed}
                disabled={seeding}
                className="bg-red-600/20 hover:bg-red-600/40 text-red-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-red-500/30 backdrop-blur-xl transition-all"
            >
                {seeding ? 'SEEDING...' : 'SEED TEST DATA (1234)'}
            </button>
        </div>
    );
};

export default DataSeeder;
