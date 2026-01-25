import { openDB } from 'idb';

const DB_NAME = 'how_many_times_db';
const STORE_LOGS = 'logs';
const STORE_USER = 'user';

export const initDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_LOGS)) {
                db.createObjectStore(STORE_LOGS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_USER)) {
                db.createObjectStore(STORE_USER);
            }
        },
    });
};

export const saveUser = async (user) => {
    const db = await initDB();
    await db.put(STORE_USER, user, 'profile');
};

export const getUser = async () => {
    const db = await initDB();
    return await db.get(STORE_USER, 'profile');
};

export const saveLog = async (timestamp) => {
    const db = await initDB();
    return await db.add(STORE_LOGS, { timestamp });
};

export const getLogs = async () => {
    const db = await initDB();
    return await db.getAll(STORE_LOGS);
};

export const deleteLastLog = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    const store = tx.objectStore(STORE_LOGS);
    const logs = await store.getAll();
    if (logs.length > 0) {
        const lastLog = logs[logs.length - 1];
        await store.delete(lastLog.id);
    }
    await tx.done;
};

export const wipeData = async () => {
    const db = await initDB();
    await db.clear(STORE_LOGS);
    await db.clear(STORE_USER);
};
