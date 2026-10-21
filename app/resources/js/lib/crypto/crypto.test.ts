import { describe, expect, it } from 'vitest';

import { DecryptionError, deriveKey, newKdfParams, open, openJson, seal, sealJson, utf8 } from '.';

describe('AES-GCM sealing', () => {
    it('round-trips, with a fresh IV every time', async () => {
        const params = await newKdfParams('pbkdf2-sha256', { iterations: 1000 });
        const key = await deriveKey('1234', params);
        const a = await sealJson(key, { hello: 'world' }, 'incident:1');
        const b = await sealJson(key, { hello: 'world' }, 'incident:1');
        expect(Array.from(a.iv)).not.toEqual(Array.from(b.iv));
        expect(await openJson(key, a, 'incident:1')).toEqual({ hello: 'world' });
    });

    it('refuses a ciphertext moved to another record (bound by context)', async () => {
        const key = await deriveKey('1234', await newKdfParams('pbkdf2-sha256', { iterations: 1000 }));
        const sealed = await seal(key, utf8.encode('secret'), 'incident:1');
        await expect(open(key, sealed, 'incident:2')).rejects.toBeInstanceOf(DecryptionError);
    });

    it('refuses a ciphertext that was altered', async () => {
        const key = await deriveKey('1234', await newKdfParams('pbkdf2-sha256', { iterations: 1000 }));
        const sealed = await seal(key, utf8.encode('secret'), 'x');
        const bytes = new Uint8Array(sealed.ct.slice(0));
        bytes[0]! ^= 0xff;
        await expect(open(key, { iv: sealed.iv, ct: bytes.buffer }, 'x')).rejects.toBeInstanceOf(DecryptionError);
    });
});

describe('key derivation', () => {
    it('derives the same key from the same PIN and parameters (Argon2id)', async () => {
        const params = await newKdfParams('argon2id', { memoryKiB: 256, iterations: 1 });
        expect(params.algo).toBe('argon2id');
        const sealed = await sealJson(await deriveKey('8642', params), 'ok', 'c');
        expect(await openJson(await deriveKey('8642', params), sealed, 'c')).toBe('ok');
        await expect(openJson(await deriveKey('8643', params), sealed, 'c')).rejects.toBeInstanceOf(DecryptionError);
    });

    it('uses production-strength defaults', async () => {
        const argon = await newKdfParams('argon2id');
        expect(argon).toMatchObject({ algo: 'argon2id', memoryKiB: 19456, iterations: 2, parallelism: 1 });
        const pbkdf2 = await newKdfParams('pbkdf2-sha256');
        expect(pbkdf2).toMatchObject({ algo: 'pbkdf2-sha256', iterations: 600_000 });
    });
});
