import { webcrypto } from 'node:crypto';

// crypto.ts calls `window.crypto.subtle` — bridge Node's built-in Web Crypto to `window`
(globalThis as { window?: { crypto: Crypto } }).window = { crypto: webcrypto };
