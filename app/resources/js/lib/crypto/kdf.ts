import { argon2id } from 'hash-wasm';

import { fromBase64, randomBytes, toBase64, utf8 } from './encoding';

/**
 * Turns the user's PIN into an AES-256-GCM key.
 *
 * Argon2id (memory-hard, via WebAssembly) is preferred; PBKDF2-SHA256 with
 * 600,000 iterations is the fallback when WebAssembly is unavailable. The
 * parameters are stored next to the vault so a key can always be re-derived
 * with the same settings, and upgraded later.
 *
 * A 4-digit PIN has only 10,000 possibilities, so these settings slow an
 * attacker who has copied the device's storage; they cannot make a short PIN
 * strong. The UI should offer a longer passcode.
 */

export type KdfParams =
    | { algo: 'argon2id'; salt: string; memoryKiB: number; iterations: number; parallelism: number }
    | { algo: 'pbkdf2-sha256'; salt: string; iterations: number };

/** OWASP-recommended Argon2id baseline: 19 MiB, 2 passes, 1 lane. */
export const ARGON2_DEFAULTS = { memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 } as const;
export const PBKDF2_ITERATIONS = 600_000;

export async function newKdfParams(
    prefer: 'argon2id' | 'pbkdf2-sha256' = 'argon2id',
    overrides: Partial<{ memoryKiB: number; iterations: number }> = {},
): Promise<KdfParams> {
    const salt = toBase64(randomBytes(16));
    if (prefer === 'argon2id' && (await argon2Available())) {
        return { algo: 'argon2id', salt, ...ARGON2_DEFAULTS, ...overrides };
    }
    return { algo: 'pbkdf2-sha256', salt, iterations: overrides.iterations ?? PBKDF2_ITERATIONS };
}

export async function deriveKey(pin: string, params: KdfParams): Promise<CryptoKey> {
    const salt = fromBase64(params.salt);
    let raw: Uint8Array<ArrayBuffer>;

    if (params.algo === 'argon2id') {
        const out = await argon2id({
            password: pin,
            salt,
            parallelism: params.parallelism,
            iterations: params.iterations,
            memorySize: params.memoryKiB,
            hashLength: 32,
            outputType: 'binary',
        });
        raw = new Uint8Array(out);
    } else {
        const material = await crypto.subtle.importKey('raw', utf8.encode(pin), 'PBKDF2', false, ['deriveBits']);
        raw = new Uint8Array(
            await crypto.subtle.deriveBits(
                { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: params.iterations },
                material,
                256,
            ),
        );
    }

    try {
        // Non-extractable: script on the page can use the key but never read it back out.
        return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    } finally {
        raw.fill(0);
    }
}

let argon2Ok: boolean | null = null;
async function argon2Available(): Promise<boolean> {
    if (argon2Ok !== null) return argon2Ok;
    try {
        await argon2id({
            password: 'x',
            salt: new Uint8Array(16),
            parallelism: 1,
            iterations: 1,
            memorySize: 8,
            hashLength: 16,
            outputType: 'hex',
        });
        argon2Ok = true;
    } catch {
        argon2Ok = false;
    }
    return argon2Ok;
}
