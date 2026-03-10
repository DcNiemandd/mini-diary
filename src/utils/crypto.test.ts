import { describe, test, expect } from 'vitest';
import { MyCrypto } from './crypto';

describe('MyCrypto', () => {
    // Helper: derive a valid 256-bit key string the same way useAuth does
    async function makeKey(password = 'test-password', salt = 'test-salt') {
        return MyCrypto.encodePassword(password, salt);
    }

    describe('generaRandomString', () => {
        test('returns a hex string of correct length', () => {
            const result = MyCrypto.generaRandomString();
            // default SALT_LENGTH is 16 bytes → 32 hex chars
            expect(result).toHaveLength(32);
            expect(result).toMatch(/^[0-9a-f]+$/);
        });

        test('returns different values each call', () => {
            expect(MyCrypto.generaRandomString()).not.toBe(MyCrypto.generaRandomString());
        });
    });

    describe('encodePassword', () => {
        test('is deterministic for same password and salt', async () => {
            const a = await MyCrypto.encodePassword('pass', 'salt');
            const b = await MyCrypto.encodePassword('pass', 'salt');
            expect(a).toBe(b);
        });

        test('differs when password changes', async () => {
            const a = await MyCrypto.encodePassword('pass1', 'salt');
            const b = await MyCrypto.encodePassword('pass2', 'salt');
            expect(a).not.toBe(b);
        });

        test('differs when salt changes', async () => {
            const a = await MyCrypto.encodePassword('pass', 'salt1');
            const b = await MyCrypto.encodePassword('pass', 'salt2');
            expect(a).not.toBe(b);
        });

        test('returns a 64-char hex string (256 bits)', async () => {
            const result = await MyCrypto.encodePassword('pass', 'salt');
            expect(result).toHaveLength(64);
            expect(result).toMatch(/^[0-9a-f]+$/);
        });
    });

    describe('encryptAESGCM / decryptAESGCM', () => {
        test('round-trips plaintext correctly', async () => {
            const key = await makeKey();
            const plaintext = 'Hello, diary!';
            const cipher = await MyCrypto.encryptAESGCM(plaintext, key);
            const result = await MyCrypto.decryptAESGCM(cipher, key);
            expect(result).toBe(plaintext);
        });

        test('produces different ciphertext each call (random IV)', async () => {
            const key = await makeKey();
            const a = await MyCrypto.encryptAESGCM('same text', key);
            const b = await MyCrypto.encryptAESGCM('same text', key);
            expect(a).not.toBe(b);
        });

        test('throws when decrypting with the wrong key', async () => {
            const key = await makeKey();
            const wrongKey = await makeKey('wrong-password');
            const cipher = await MyCrypto.encryptAESGCM('secret', key);
            await expect(MyCrypto.decryptAESGCM(cipher, wrongKey)).rejects.toThrow();
        });

        test('round-trips empty string', async () => {
            const key = await makeKey();
            const cipher = await MyCrypto.encryptAESGCM('', key);
            const result = await MyCrypto.decryptAESGCM(cipher, key);
            expect(result).toBe('');
        });

        test('round-trips unicode / emoji content', async () => {
            const key = await makeKey();
            const text = 'Today was great 🎉 — café vibes';
            const cipher = await MyCrypto.encryptAESGCM(text, key);
            expect(await MyCrypto.decryptAESGCM(cipher, key)).toBe(text);
        });
    });

    describe('generateHMAC / verifyKey', () => {
        test('generates a consistent HMAC for same inputs', async () => {
            const a = await MyCrypto.generateHMAC('data', 'secret');
            const b = await MyCrypto.generateHMAC('data', 'secret');
            expect(a).toBe(b);
        });

        test('verifyKey returns true for correct key', async () => {
            const encodedPassword = await makeKey();
            const dbKey = MyCrypto.generaRandomString();
            const hmac = await MyCrypto.generateHMAC(dbKey, encodedPassword);
            expect(await MyCrypto.verifyKey(dbKey, hmac, encodedPassword)).toBe(true);
        });

        test('verifyKey returns false for tampered key', async () => {
            const encodedPassword = await makeKey();
            const dbKey = MyCrypto.generaRandomString();
            const hmac = await MyCrypto.generateHMAC(dbKey, encodedPassword);
            expect(await MyCrypto.verifyKey('tampered', hmac, encodedPassword)).toBe(false);
        });

        test('verifyKey returns false for wrong secret', async () => {
            const encodedPassword = await makeKey();
            const wrongPassword = await makeKey('other-password');
            const dbKey = MyCrypto.generaRandomString();
            const hmac = await MyCrypto.generateHMAC(dbKey, encodedPassword);
            expect(await MyCrypto.verifyKey(dbKey, hmac, wrongPassword)).toBe(false);
        });
    });

    describe('full login simulation', () => {
        // mirrors exactly what useAuth.tryToLogin does on first login + re-login
        test('re-login with correct password recovers the database key', async () => {
            const password = 'my-secure-password';

            // --- first login (account creation) ---
            const salt = MyCrypto.generaRandomString();
            const encodedPassword = await MyCrypto.encodePassword(password, salt);
            const dbKey = MyCrypto.generaRandomString();
            const encodedDbKey = await MyCrypto.encryptAESGCM(dbKey, encodedPassword);
            const hmac = await MyCrypto.generateHMAC(dbKey, encodedPassword);

            // --- re-login ---
            const encodedPassword2 = await MyCrypto.encodePassword(password, salt);
            const recoveredDbKey = await MyCrypto.decryptAESGCM(encodedDbKey, encodedPassword2);
            const isValid = await MyCrypto.verifyKey(recoveredDbKey, hmac, encodedPassword2);

            expect(isValid).toBe(true);
            expect(recoveredDbKey).toBe(dbKey);
        });

        test('re-login with wrong password fails decryption or HMAC', async () => {
            const password = 'my-secure-password';
            const wrongPassword = 'wrong-password';

            const salt = MyCrypto.generaRandomString();
            const encodedPassword = await MyCrypto.encodePassword(password, salt);
            const dbKey = MyCrypto.generaRandomString();
            const encodedDbKey = await MyCrypto.encryptAESGCM(dbKey, encodedPassword);
            const hmac = await MyCrypto.generateHMAC(dbKey, encodedPassword);

            const wrongEncoded = await MyCrypto.encodePassword(wrongPassword, salt);

            let loginSucceeded: boolean;
            try {
                const recoveredDbKey = await MyCrypto.decryptAESGCM(encodedDbKey, wrongEncoded);
                loginSucceeded = await MyCrypto.verifyKey(recoveredDbKey, hmac, wrongEncoded);
            } catch {
                loginSucceeded = false;
            }

            expect(loginSucceeded).toBe(false);
        });
    });
});
