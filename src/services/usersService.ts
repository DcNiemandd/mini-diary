import { MyCrypto } from '../utils/crypto';
import { defaultUserSettings, ENTRIES_STORE, getDb, USERS_STORE, type UserRecord, type UserSettings } from './db';

/**
 * Returns the most-recently-inserted user, or `null` if none.
 * Post-v3 there is at most one row pre-claim (the sentinel `username === ''`);
 * UI flows use {@link getUserByUsername} once accounts are named.
 */
export const getCurrentUser = async (): Promise<Required<UserRecord> | null> => {
    const db = await getDb();
    const all = await db.getAll(USERS_STORE);
    return (all.at(-1) as Required<UserRecord> | undefined) ?? null;
};

export const getUserByUsername = async (username: string): Promise<Required<UserRecord> | null> => {
    const db = await getDb();
    const user = (await db.getFromIndex(USERS_STORE, 'username', username)) as Required<UserRecord> | undefined;
    return user ?? null;
};

export const usernameExists = async (username: string): Promise<boolean> => {
    return (await getUserByUsername(username)) !== null;
};

export const putUser = async (user: UserRecord): Promise<Required<UserRecord>> => {
    const db = await getDb();
    const id = await db.put(USERS_STORE, user);
    return { ...user, id: id as number };
};

/**
 * @throws Username required
 * @throws Username already taken
 * @throws User not found
 */
export const renameUser = async (userId: number, newUsername: string): Promise<Required<UserRecord>> => {
    if (!newUsername) throw new Error('Username required');
    const conflict = await getUserByUsername(newUsername);
    if (conflict && conflict.id !== userId) throw new Error('Username already taken');

    const db = await getDb();
    const existing = (await db.get(USERS_STORE, userId)) as UserRecord | undefined;
    if (!existing) throw new Error('User not found');
    const updated: Required<UserRecord> = { ...existing, id: userId, username: newUsername };
    await db.put(USERS_STORE, updated);
    return updated;
};

export const updateUserSettings = async (userId: number, settings: UserSettings): Promise<void> => {
    const db = await getDb();
    const existing = (await db.get(USERS_STORE, userId)) as UserRecord | undefined;
    if (!existing) throw new Error('User not found');
    await db.put(USERS_STORE, { ...existing, id: userId, settings });
};

/**
 * @throws Wrong password
 * @throws HMAC failed
 */
export const tryLogin = async (userAuth: UserRecord, password: string) => {
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

export const generateUser = async (userKey: string, password: string, username: string = ''): Promise<UserRecord> => {
    const salt = MyCrypto.generaRandomString();
    const encodedPassword = await MyCrypto.encodePassword(password, salt);
    const encodedUserKey = await MyCrypto.encryptAESGCM(userKey, encodedPassword);
    const hmac = await MyCrypto.generateHMAC(userKey, encodedPassword);

    return {
        username,
        encryptedUserKey: encodedUserKey,
        salt,
        hmac,
        settings: defaultUserSettings(),
    };
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

    const newUser: UserRecord = {
        ...(await generateUser(userKey, newPassword, oldUser.username)),
        id: oldUser.id,
        settings: oldUser.settings,
    };

    await db.put(USERS_STORE, newUser);

    return newUser;
};

export const deleteUserAndEntries = async (userId: number): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction([USERS_STORE, ENTRIES_STORE], 'readwrite');

    await tx.objectStore(USERS_STORE).delete(userId);

    const idx = tx.objectStore(ENTRIES_STORE).index('userPk_order');
    const range = IDBKeyRange.bound([userId, -Infinity], [userId, Infinity]);
    let cursor = await idx.openCursor(range);
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await tx.done;
};
