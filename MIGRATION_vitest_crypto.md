# Vitest Setup for Crypto Testing

## Why these choices

### `@peculiar/webcrypto` instead of `environment: 'node'`
`crypto.ts` calls `window.crypto.subtle`. In a Node environment `window` doesn't exist,
so the code would throw at import time. Two options:
- `environment: 'jsdom'` — gives us `window`, but jsdom does NOT implement Web Crypto.
- `environment: 'node'` — Node 20+ has `globalThis.crypto`, but `window` is still undefined.

The cleanest fix: use `environment: 'node'` and assign the Node crypto global to `window`
in a setup file. This avoids a third-party polyfill dependency.

### Separate `vitest.config.ts` instead of merging into `vite.config.ts`
`vite.config.ts` loads the React compiler Babel plugin and PWA plugin. Those don't belong
in a test run and slow things down. Keeping configs separate also lets you run
`vite build` and `vitest` independently without coupling.

---

## Step 1 — Install vitest

```bash
npm install -D vitest
```

That's the only new dependency needed. No jsdom, no polyfill library.

---

## Step 2 — Create `vitest.config.ts`

Create a new file at the project root: `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
    },
});
```

**Why `environment: 'node'`**: Node 20+ ships `globalThis.crypto` (the Web Crypto API).
We just need to bridge it to `window.crypto` which the setup file handles.

---

## Step 3 — Create `src/test/setup.ts`

Create the directory `src/test/` and add `setup.ts`:

```ts
import { webcrypto } from 'node:crypto';

// crypto.ts calls `window.crypto.subtle` — bridge Node's built-in Web Crypto to `window`
(globalThis as any).window = { crypto: webcrypto };
```

**Why**: `node:crypto` exposes the same Web Crypto API that browsers have (`subtle.encrypt`,
`subtle.deriveBits`, etc.), but under `globalThis.crypto`, not `window.crypto`.
This one-liner makes both work without any polyfill package.

---

## Step 4 — Add test script to `package.json`

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

`vitest run` exits after one pass (good for CI). `vitest` stays in watch mode.

---

## Step 5 — Write the crypto tests

Create `src/utils/crypto.test.ts`:

```ts
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
```

---

## Summary of files to create/change

| Action | File |
|--------|------|
| Create | `vitest.config.ts` |
| Create | `src/test/setup.ts` |
| Create | `src/utils/crypto.test.ts` |
| Edit   | `package.json` — add `test` and `test:watch` scripts |

No changes to `vite.config.ts` needed.
