import { randomBytes, utf8 } from './encoding';

/**
 * AES-256-GCM with a fresh 96-bit IV per message. The "context" string is
 * passed as additional authenticated data, binding each ciphertext to the
 * record it belongs to, so ciphertexts cannot be swapped between records.
 */

export interface Sealed {
    iv: Uint8Array<ArrayBuffer>;
    ct: ArrayBuffer;
}

export class DecryptionError extends Error {
    constructor(message = 'Could not decrypt: wrong key or the data was changed') {
        super(message);
        this.name = 'DecryptionError';
    }
}

export async function seal(key: CryptoKey, plaintext: BufferSource, context: string): Promise<Sealed> {
    const iv = randomBytes(12);
    const ct = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: utf8.encode(context) },
        key,
        plaintext,
    );
    return { iv, ct };
}

export async function open(key: CryptoKey, sealed: Sealed, context: string): Promise<ArrayBuffer> {
    try {
        return await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: sealed.iv, additionalData: utf8.encode(context) },
            key,
            sealed.ct,
        );
    } catch {
        throw new DecryptionError();
    }
}

export async function sealJson(key: CryptoKey, value: unknown, context: string): Promise<Sealed> {
    return seal(key, utf8.encode(JSON.stringify(value)), context);
}

export async function openJson<T>(key: CryptoKey, sealed: Sealed, context: string): Promise<T> {
    return JSON.parse(utf8.decode(await open(key, sealed, context))) as T;
}
