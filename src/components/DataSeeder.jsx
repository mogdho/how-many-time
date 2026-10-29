import React, { useState } from 'react';
import { saveUser, saveLog, wipeData } from '../lib/db';
import { hashPIN } from '../lib/security';
import { useDialog } from './DialogProvider';

const DataSeeder = () => {
    const [seeding, setSeeding] = useState(false);
    const dialog = useDialog();

    const handleSeed = async () => {
        const ok = await dialog.confirm({
            title: 'Seed test data?',
            message: 'This wipes all current data and fills the app with 3 weeks of test entries (PIN 1234).',
            confirmText: 'Seed',
            danger: true,
        });
        if (!ok) return;

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

            await dialog.alert({ title: 'Seeding complete', message: 'The app will reload now.' });
            window.location.reload();
        } catch (error) {
            console.error("Seeding failed", error);
            await dialog.alert({ title: 'Seeding failed', message: 'Check the browser console for details.', danger: true });
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            <button
                onClick={handleSeed}
                disabled={seeding}
                className="btn btn-ghost !text-[10px] !py-2 !px-4 hover:!border-crimson hover:!bg-crimson/20"
            >
                {seeding ? 'SEEDING...' : 'SEED TEST DATA (1234)'}
            </button>
        </div>
    );
};

export default DataSeeder;
