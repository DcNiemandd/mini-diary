

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

const arrayBufferToHexString = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const hexStringToArrayBuffer = (hexString: string): ArrayBuffer => {
    const byteArray = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return byteArray.buffer;
}

export class MyCrypto {
    static encodePassword = async (password: string, salt: string): Promise<string> => {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: enc.encode(salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256 // bits
        );
        return arrayBufferToHexString(derivedBits);
    }

    static generaRandomString = (length: number = SALT_LENGTH): string => {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return arrayBufferToHexString(array.buffer);
    }

    static getCryptoKey = async (key: string): Promise<CryptoKey> => {
        const keyBuffer = hexStringToArrayBuffer(key);

        return window.crypto.subtle.importKey(
            'raw', keyBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
        );
    }

    static encryptAESGCM = async (plaintext: string, key: string): Promise<string> => {
        const enc = new TextEncoder();
        const cryptoKey = await this.getCryptoKey(key);

        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const cipherText = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv }, cryptoKey, enc.encode(plaintext)
        );
        const combined = new Uint8Array(iv.length + cipherText.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(cipherText), iv.length);
        return arrayBufferToHexString(combined.buffer);
    }

    static decryptAESGCM = async (cipherText: string, key: string): Promise<string> => {
        const dec = new TextDecoder();
        const cryptoKey = await this.getCryptoKey(key);

        const cipherBytes = hexStringToArrayBuffer(cipherText);
        const iv = new Uint8Array(cipherBytes.slice(0, 12));
        const data = cipherBytes.slice(12);
        const plainBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv }, cryptoKey, data
        );
        return dec.decode(plainBuffer);
    }

    // Generate HMAC
    static generateHMAC = async (dataToSum: string, secretKey: string): Promise<string> => {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(secretKey),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSum));
        return arrayBufferToHexString(signature);
    }

    // Verify HMAC
    static verifyKey = async (decryptedKey: string, storedHMAC: string, secretKey: string): Promise<boolean> => {
        const hmac = await this.generateHMAC(decryptedKey, secretKey);
        return hmac === storedHMAC;
    }
}