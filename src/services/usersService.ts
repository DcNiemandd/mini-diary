import { MyCrypto } from '../utils/crypto';
import { ENTRIES_STORE, getDb, USERS_STORE, type UserRecord } from './db';

/** ONLY ONE USER FOR NOW */
export const getCurrentUser = async (): Promise<UserRecord | null> => {
    const db = await getDb();
    const all = await db.getAll(USERS_STORE);
    return all[0] ?? null;
};

export const putUser = async (user: UserRecord): Promise<void> => {
    const db = await getDb();
    await db.put(USERS_STORE, user);
};

/**
 * @throws Wrong password
 * @throws HMAC failed
 */
export const tryLogin = async (userAuth: UserRecord, password: string) => {
    const encodedPassword = await MyCrypto.encodePassword(password, userAuth.salt);
    let userKey: string | null = null;
    try {
        userKey = await MyCrypto.decryptAESGCM(userAuth.userId, encodedPassword);
    } catch {
        throw new Error('Wrong password');
    }

    if ((await MyCrypto.verifyKey(userKey, userAuth.hmac, encodedPassword)) === false) {
        throw new Error('HMAC verification failed');
    }

    return userKey;
};

export const generateUser = async (userId: string, password: string) => {
    const salt = MyCrypto.generaRandomString();
    const encodedPassword = await MyCrypto.encodePassword(password, salt);
    const encodedUserId = await MyCrypto.encryptAESGCM(userId, encodedPassword);
    const hmac = await MyCrypto.generateHMAC(userId, encodedPassword);

    const userAuth: UserRecord = {
        userId: encodedUserId,
        salt,
        hmac,
    };

    return userAuth;
};

/**
 * @throws No user
 */
export const changeUserPassword = async (oldPassword: string, newPassword: string): Promise<UserRecord> => {
    const db = await getDb();

    const oldUser = await getCurrentUser();
    if (!oldUser) throw new Error('No user available');

    let userKey;
    try {
        userKey = await tryLogin(oldUser, oldPassword);
    } catch (e) {
        throw new Error(`Old password incorrect - ${e}`);
    }

    const newUser = await generateUser(userKey, newPassword);

    const transaction = db.transaction([USERS_STORE, ENTRIES_STORE], 'readwrite');
    await transaction.objectStore(USERS_STORE).delete(oldUser.userId);
    await transaction.objectStore(USERS_STORE).add(newUser);

    const idx = transaction.objectStore(ENTRIES_STORE).index('userId_id');
    const range = IDBKeyRange.bound([oldUser.userId, -Infinity], [oldUser.userId, Infinity]);
    let cursor = await idx.openCursor(range);
    while (cursor) {
        await cursor.update({ ...cursor.value, userId: newUser.userId });
        cursor = await cursor.continue();
    }
    await transaction.done;

    return newUser;
};

export const deleteUserAndEntries = async (userId: string): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction([USERS_STORE, ENTRIES_STORE], 'readwrite');

    await tx.objectStore(USERS_STORE).delete(userId);

    const idx = tx.objectStore(ENTRIES_STORE).index('userId_id');
    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    let cursor = await idx.openCursor(range);
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await tx.done;
};
