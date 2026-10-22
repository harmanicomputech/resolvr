import { describe, expect, test } from 'vitest';

import { content, freshVault } from '@/test/fixtures';

import type { LedgerEntry } from './incidents';

/*
 * Security audit (Q3): what actually lands in IndexedDB, and whether the
 * hash chain notices edits made behind the app's back.
 */

const contains = (haystack: ArrayBuffer | Uint8Array, needle: string) => {
    const bytes = haystack instanceof Uint8Array ? haystack : new Uint8Array(haystack);
    const n = new TextEncoder().encode(needle);
    outer: for (let i = 0; i + n.length <= bytes.length; i++) {
        for (let j = 0; j < n.length; j++) if (bytes[i + j] !== n[j]) continue outer;
        return true;
    }
    return false;
};

describe('evidence and records are encrypted before they reach IndexedDB', () => {
    test('rows hold ciphertext only: no titles, names, notes or file bytes', async () => {
        const { db, repos } = await freshVault();
        await repos.incidents.create(
            content({ title: 'Secret meeting with Dana', description: 'Dana said the quiet part' }),
        );
        await repos.files.add(new File(['PLAINTEXT-EVIDENCE-BYTES'], 'dana-email.txt', { type: 'text/plain' }));

        for (const row of await db.records.toArray()) {
            expect(row.id).toMatch(/^[a-z]+:[0-9a-z-]+$/);
            for (const secret of ['Dana', 'Secret meeting', 'dana-email', 'quiet part']) {
                expect(contains(row.ct, secret)).toBe(false);
            }
        }
        for (const blob of await db.blobs.toArray()) expect(contains(blob.ct, 'PLAINTEXT-EVIDENCE-BYTES')).toBe(false);
    });

    test('plaintext meta holds nothing personal and no usable key', async () => {
        const { db } = await freshVault('2468');
        const meta = await db.meta.toArray();
        expect(meta.map((m) => m.key).sort()).toEqual(['schemaVersion', 'unlockers']);
        const { pin } = meta.find((m) => m.key === 'unlockers')!.value as {
            pin: { dek: { iv: Uint8Array; ct: ArrayBuffer } };
        };
        // The data key is stored only wrapped: 32 key bytes + 16-byte GCM tag.
        expect(pin.dek.ct.byteLength).toBe(48);
        expect(JSON.stringify(meta)).not.toContain('2468');
    });

    test('the in-memory key cannot be exported', async () => {
        const { vault } = await freshVault();
        const sealed = await vault.sealBytes(new Uint8Array([1]), 'probe');
        expect(sealed.ct.byteLength).toBe(17);
        // No method exposes the key; even a reflected CryptoKey would be non-extractable.
        expect(Object.keys(vault)).not.toContain('key');
        vault.lock();
        expect(() => vault.sealBytes(new Uint8Array([1]), 'probe')).toThrow(/locked/);
    });
});

describe('the hash chain detects tampering', () => {
    test('editing a past ledger entry breaks the chain', async () => {
        const { repos, vault } = await freshVault();
        const a = await repos.incidents.create(content({ title: 'First' }));
        await repos.incidents.create(content({ title: 'Second' }));
        expect((await repos.incidents.verify()).ok).toBe(true);

        // Someone with the key rewrites history directly in storage.
        const ledger = await repos.incidents.ledger();
        const first = ledger[0]!;
        const forged: LedgerEntry = {
            ...first,
            body: {
                ...first.body,
                snapshot: { ...first.body.snapshot, content: { ...first.body.snapshot.content, title: 'Rewritten' } },
            },
        };
        await vault.put('ledger', String(first.seq).padStart(9, '0'), forged);

        const verdict = await repos.incidents.verify();
        expect(verdict.ok).toBe(false);
        expect(a.incId).toBe('INC-001');
    });

    test('editing an incident without a ledger entry is flagged', async () => {
        const { repos, vault } = await freshVault();
        const a = await repos.incidents.create(content({ title: 'Original' }));
        await vault.put('incident', a.id, {
            ...a,
            content: { ...a.content, title: 'Quietly changed' },
            hash: 'f'.repeat(64),
        });
        expect((await repos.incidents.verify()).mismatchedIncidents).toEqual([a.incId]);
    });

    test('a ciphertext moved onto another record fails to decrypt', async () => {
        const { db, repos } = await freshVault();
        const a = await repos.incidents.create(content({ title: 'A' }));
        const b = await repos.incidents.create(content({ title: 'B' }));
        const rowA = (await db.records.get(`incident:${a.id}`))!;
        await db.records.put({ ...rowA, id: `incident:${b.id}` });
        await expect(repos.incidents.get(b.id)).rejects.toThrow();
    });
});
