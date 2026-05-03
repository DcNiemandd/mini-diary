import { MyCrypto } from '../utils/crypto';
import { ENTRIES_STORE, getDb, USERS_STORE, type UserRecord } from './db';

/** ONLY ONE USER FOR NOW */
export const getCurrentUser = async (): Promise<Required<UserRecord> | null> => {
    const db = await getDb();
    const all = await db.getAll(USERS_STORE);
    return all[0] ?? null;
};

export const putUser = async (user: UserRecord): Promise<Required<UserRecord>> => {
    const db = await getDb();
    const id = await db.put(USERS_STORE, user);
    return { ...user, id: id as number };
};

/**
 * @throws Wrong password
 * @throws HMAC failed
 */
export const tryLogin = async (userAuth: UserRecord, password: string) => {
    console.log({ userAuth, password });
    const encodedPassword = await MyCrypto.encodePassword(password, userAuth.salt);
    let userKey: string | null = null;
    try {
        userKey = await MyCrypto.decryptAESGCM(userAuth.encryptedUserKey, encodedPassword);
    } catch {
        throw new Error('Wrong password');
    }

    if ((await MyCrypto.verifyKey(userKey, userAuth.hmac, encodedPassword)) === false) {
        throw new Error('HMAC verification failed');
    }

    return userKey;
};

export const generateUser = async (userKey: string, password: string) => {
    const salt = MyCrypto.generaRandomString();
    const encodedPassword = await MyCrypto.encodePassword(password, salt);
    const encodedUserKey = await MyCrypto.encryptAESGCM(userKey, encodedPassword);
    const hmac = await MyCrypto.generateHMAC(userKey, encodedPassword);

    const userAuth: UserRecord = {
        encryptedUserKey: encodedUserKey,
        salt,
        hmac,
    };

    return userAuth;
};

/**
 * @throws No user
 * @throws Incorrect password
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
    newUser.id = oldUser.id;

    await db.put(USERS_STORE, newUser);

    return newUser;
};

export const deleteUserAndEntries = async (userId: number): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction([USERS_STORE, ENTRIES_STORE], 'readwrite');

    await tx.objectStore(USERS_STORE).delete(userId);

    const idx = tx.objectStore(ENTRIES_STORE).index('userPk_id');
    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    let cursor = await idx.openCursor(range);
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await tx.done;
};
