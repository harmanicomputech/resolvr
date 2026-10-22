import { describe, expect, test } from 'vitest';

import { repositories, Vault, WrongPinError } from '@/lib/db';
import { content, FAST_KDF, freshDb, freshVault } from '@/test/fixtures';

import { BackupDamagedError, createBackup, readBackupHeader, restoreBackup } from './format';
import { deriveRecovery, generatePhrase, isValidPhrase, normalisePhrase, unknownWords } from './recovery';

describe('recovery phrase', () => {
    test('is 12 valid words and derives stable ids', async () => {
        const phrase = generatePhrase();
        expect(phrase.split(' ')).toHaveLength(12);
        expect(isValidPhrase(`  ${phrase.toUpperCase().replace(/ /g, '   ')} `)).toBe(true);
        const a = await deriveRecovery(phrase);
        const b = await deriveRecovery(normalisePhrase(phrase));
        expect(a.backupId).toMatch(/^[0-9a-f]{32}$/);
        expect(a.backupId).toBe(b.backupId);
        expect(a.token).toBe(b.token);
        expect(a.token).not.toContain(a.backupId);
    });

    test('flags typos', () => {
        expect(isValidPhrase('abandon abandon')).toBe(false);
        expect(unknownWords('abandon zzzz ability')).toEqual(['zzzz']);
    });
});

async function vaultWithData() {
    const made = await freshVault('1357');
    await made.repos.incidents.create(content({ title: 'Kept safe' }));
    await made.vault.putBlob('file-1', new Uint8Array([1, 2, 3, 4]).buffer);
    const phrase = generatePhrase();
    const keys = await deriveRecovery(phrase);
    await made.vault.addUnlocker('recovery', '1357', keys.wrappingKey);
    return { ...made, phrase, keys };
}

describe('encrypted backup', () => {
    test('round-trips onto a new device with a new PIN', async () => {
        const { vault, keys } = await vaultWithData();
        const blob = await createBackup(vault);
        const { header } = await readBackupHeader(blob);
        expect(JSON.stringify(header)).not.toContain('Kept safe');

        const db = freshDb();
        const restored = await restoreBackup(blob, keys.wrappingKey, '9999', { db, kdf: FAST_KDF });
        const list = await repositories(restored).incidents.list();
        expect(list.map((i) => i.content.title)).toEqual(['Kept safe']);
        expect(new Uint8Array((await restored.getBlob('file-1'))!)).toEqual(new Uint8Array([1, 2, 3, 4]));
        restored.lock();
        await expect(Vault.unlock('1357', { db, kdf: FAST_KDF })).rejects.toBeInstanceOf(WrongPinError);
        expect((await Vault.unlock('9999', { db })).locked).toBe(false);
    });

    test('never carries the PIN unlocker', async () => {
        const { vault } = await vaultWithData();
        const { header } = await readBackupHeader(await createBackup(vault));
        expect(Object.keys(header)).not.toContain('pin');
        expect(JSON.stringify(header)).not.toContain('kdf');
    });

    test('refuses a wrong phrase without writing anything', async () => {
        const { vault } = await vaultWithData();
        const blob = await createBackup(vault);
        const other = await deriveRecovery(generatePhrase());
        const db = freshDb();
        await expect(restoreBackup(blob, other.wrappingKey, '9999', { db, kdf: FAST_KDF })).rejects.toBeInstanceOf(
            WrongPinError,
        );
        expect(await Vault.exists(db)).toBe(false);
    });

    test('refuses a file that was cut short', async () => {
        const { vault, keys } = await vaultWithData();
        const blob = await createBackup(vault);
        const cut = blob.slice(0, blob.size - 3);
        const db = freshDb();
        await expect(restoreBackup(cut, keys.wrappingKey, '9999', { db, kdf: FAST_KDF })).rejects.toBeInstanceOf(
            BackupDamagedError,
        );
    });

    test('needs a recovery phrase first', async () => {
        const { vault } = await freshVault();
        await expect(createBackup(vault)).rejects.toThrow(/recovery phrase/);
    });

    test('resets a forgotten PIN with the phrase', async () => {
        const { db, phrase } = await vaultWithData();
        const keys = await deriveRecovery(phrase);
        (await Vault.resetPinWithRecovery(keys.wrappingKey, '0000', { db, kdf: FAST_KDF })).lock();
        expect((await Vault.unlock('0000', { db })).locked).toBe(false);
    });
});
