import { describe, expect, it } from 'vitest';

import { FAST_KDF, freshDb, freshVault } from '@/test/fixtures';

import { keyFromSecret } from '../crypto';
import { Vault, VaultLockedError, WrongPinError } from './vault';

describe('Vault', () => {
    it('unlocks with the right PIN and refuses a wrong one', async () => {
        const { db } = await freshVault('2468');
        await expect(Vault.unlock('2468', { db })).resolves.toBeInstanceOf(Vault);
        await expect(Vault.unlock('1357', { db })).rejects.toBeInstanceOf(WrongPinError);
    });

    it('never stores the PIN or any plaintext', async () => {
        const { db, repos } = await freshVault('2468');
        await repos.incidents.create({
            title: 'Secret meeting note',
            types: ['Verbal Harassment'],
            severity: 'high',
            occurredAt: '2026-03-02T09:00:00.000Z',
            description: 'Very private words',
        });
        const dump = JSON.stringify({
            meta: await db.meta.toArray(),
            records: (await db.records.toArray()).map((r) => ({ ...r, ct: Array.from(new Uint8Array(r.ct)) })),
        });
        expect(dump).not.toContain('2468');
        for (const row of await db.records.toArray()) {
            const text = new TextDecoder('utf-8', { fatal: false }).decode(row.ct);
            expect(text).not.toContain('Secret meeting');
            expect(text).not.toContain('private words');
        }
    });

    it('forgets the key on lock', async () => {
        const { vault, repos } = await freshVault();
        let cleared = false;
        vault.onLock(() => (cleared = true));
        vault.lock();
        expect(vault.locked).toBe(true);
        expect(cleared).toBe(true);
        await expect(repos.incidents.list()).rejects.toBeInstanceOf(VaultLockedError);
    });

    it('stores file bytes encrypted and returns them intact', async () => {
        const { db, repos } = await freshVault();
        const original = new File([new TextEncoder().encode('screenshot-bytes-123')], 'shot.png', {
            type: 'image/png',
        });
        const record = await repos.files.add(original);
        const raw = await db.blobs.get(record.id);
        expect(new TextDecoder().decode(raw!.ct)).not.toContain('screenshot-bytes');
        const back = await repos.files.open(record.id);
        expect(await back!.text()).toBe('screenshot-bytes-123');
        expect(await repos.files.verify(record.id)).toBe(true);
    });

    it('changes the PIN by re-wrapping the data key', async () => {
        const { db, vault, repos } = await freshVault('1111');
        await repos.singletons.saveProfile({ fullName: 'Sam Doe' });
        await vault.changePin('1111', '2222', { kdf: FAST_KDF });
        await expect(Vault.unlock('1111', { db })).rejects.toBeInstanceOf(WrongPinError);
        const reopened = await Vault.unlock('2222', { db });
        expect((await reopened.get<{ fullName: string }>('profile', 'me'))?.fullName).toBe('Sam Doe');
    });

    it('refuses to create a second vault', async () => {
        const db = freshDb();
        await Vault.create('1234', { db, kdf: FAST_KDF });
        await expect(Vault.create('5678', { db, kdf: FAST_KDF })).rejects.toThrow(/already exists/);
    });

    it('unlocks with an added passkey or recovery secret, and stops once it is removed', async () => {
        const { db, vault, repos } = await freshVault('1111');
        await repos.singletons.saveProfile({ fullName: 'Sam Doe' });
        const secret = crypto.getRandomValues(new Uint8Array(32));
        const wrap = await keyFromSecret(secret, 'resolvr-passkey');
        await expect(vault.addUnlocker('passkey', '9999', wrap)).rejects.toBeInstanceOf(WrongPinError);
        await vault.addUnlocker('passkey', '1111', wrap, { credentialId: 'abc' });
        expect((await Vault.unlockers(db)).passkey?.data?.credentialId).toBe('abc');

        const reopened = await Vault.unlockWith('passkey', await keyFromSecret(secret, 'resolvr-passkey'), { db });
        expect((await reopened.get<{ fullName: string }>('profile', 'me'))?.fullName).toBe('Sam Doe');
        const wrong = await keyFromSecret(new Uint8Array(32), 'resolvr-passkey');
        await expect(Vault.unlockWith('passkey', wrong, { db })).rejects.toBeInstanceOf(WrongPinError);

        await vault.removeUnlocker('passkey');
        await expect(Vault.unlockWith('passkey', wrap, { db })).rejects.toThrow(/No passkey/);
    });
});
