import { generateMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { keyFromSecret, toBase64, toHex, utf8 } from '../crypto';

/**
 * The recovery phrase: 12 everyday words (BIP39 English list, 128 bits of
 * randomness). Everything needed to restore comes from it:
 *
 *   wrapping key  unwraps the vault's data key (the "recovery" unlocker)
 *   backup id     names the encrypted backup on the server
 *   access token  proves to the server you may read or replace that backup
 *
 * The server stores only a hash of the token and never sees the phrase or a
 * key, so it can hand back ciphertext but never open it.
 */

export const PHRASE_WORDS = 12;

export function generatePhrase(): string {
    return generateMnemonic(wordlist, 128);
}

/** Lower-case, single-spaced, so pasted or hand-typed phrases compare equal. */
export function normalisePhrase(input: string): string {
    return input.trim().toLowerCase().split(/\s+/).join(' ');
}

export function isValidPhrase(input: string): boolean {
    return validateMnemonic(normalisePhrase(input), wordlist);
}

/** Words that are not on the list, for a gentle inline hint while typing. */
export function unknownWords(input: string): string[] {
    const set = new Set(wordlist);
    return normalisePhrase(input)
        .split(' ')
        .filter((w) => w && !set.has(w));
}

export function suggestWords(prefix: string, limit = 4): string[] {
    const p = prefix.trim().toLowerCase();
    return p.length < 2 ? [] : wordlist.filter((w) => w.startsWith(p)).slice(0, limit);
}

export interface RecoveryKeys {
    wrappingKey: CryptoKey;
    /** 32 hex characters. */
    backupId: string;
    /** Base64url bearer token for the backup API. */
    token: string;
}

async function hkdfBytes(
    secret: Uint8Array<ArrayBuffer>,
    info: string,
    length: number,
): Promise<Uint8Array<ArrayBuffer>> {
    const material = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8.encode(info) },
        material,
        length * 8,
    );
    return new Uint8Array(bits);
}

export async function deriveRecovery(phrase: string): Promise<RecoveryKeys> {
    const normal = normalisePhrase(phrase);
    if (!validateMnemonic(normal, wordlist)) throw new Error('That recovery phrase is not complete or has a typo.');
    const entropy = new Uint8Array(mnemonicToEntropy(normal, wordlist));
    try {
        const [wrappingKey, id, token] = await Promise.all([
            keyFromSecret(entropy, 'resolvr:recovery:wrap'),
            hkdfBytes(entropy, 'resolvr:backup:id', 16),
            hkdfBytes(entropy, 'resolvr:backup:token', 32),
        ]);
        return {
            wrappingKey,
            backupId: toHex(id),
            token: toBase64(token).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
        };
    } finally {
        entropy.fill(0);
    }
}
