import { webcrypto } from 'node:crypto';

// crypto.ts calls `window.crypto.subtle` — bridge Node's built-in Web Crypto to `window`
(globalThis as any).window = { crypto: webcrypto };
