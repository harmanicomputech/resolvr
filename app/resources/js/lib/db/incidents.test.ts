import { describe, expect, it } from 'vitest';

import { DecryptionError } from '@/lib/crypto';
import { content, freshVault } from '@/test/fixtures';

import type { LedgerEntry } from './incidents';

describe('IncidentRepository', () => {
    it('assigns INC numbers that are never reused', async () => {
        const { repos } = await freshVault();
        const a = await repos.incidents.create(content());
        const b = await repos.incidents.create(content());
        expect([a.incId, b.incId]).toEqual(['INC-001', 'INC-002']);
        await repos.incidents.trash(b.id);
        const c = await repos.incidents.create(content());
        expect(c.incId).toBe('INC-003');
    });

    it('edits append versions instead of overwriting', async () => {
        const { repos } = await freshVault();
        const created = await repos.incidents.create(content({ title: 'First' }));
        const edited = await repos.incidents.update(created.id, content({ title: 'Second' }));
        await repos.incidents.annotate(created.id, 'HR replied today');
        const history = await repos.incidents.history(created.id);
        expect(history.map((h) => [h.body.op, h.body.version])).toEqual([
            ['create', 1],
            ['edit', 2],
            ['annotate', 3],
        ]);
        expect(history[0]!.body.snapshot.content.title).toBe('First');
        expect(edited.content.title).toBe('Second');
        expect((await repos.incidents.get(created.id))!.annotations[0]!.text).toBe('HR replied today');
    });

    it('chains every version and verifies the chain', async () => {
        const { repos } = await freshVault();
        const a = await repos.incidents.create(content());
        await repos.incidents.create(content({ title: 'Another' }));
        await repos.incidents.update(a.id, content({ severity: 'high' }));
        const verdict = await repos.incidents.verify();
        expect(verdict).toMatchObject({ ok: true, length: 3, mismatchedIncidents: [] });
        const ledger = await repos.incidents.ledger();
        expect(ledger[1]!.prevHash).toBe(ledger[0]!.hash);
    });

    it('detects a history entry that was rewritten, even with the right key', async () => {
        const { vault, repos } = await freshVault();
        await repos.incidents.create(content({ title: 'Original' }));
        await repos.incidents.create(content({ title: 'Later' }));

        // Someone with the PIN quietly rewrites the first version's description.
        const first = await vault.get<LedgerEntry>('ledger', '000000001');
        first!.body.snapshot.content.description = 'Nothing really happened.';
        await vault.put('ledger', '000000001', first);

        expect(await repos.incidents.verify()).toMatchObject({ ok: false, brokenAt: 1, reason: 'hash' });
    });

    it('detects a deleted history entry', async () => {
        const { vault, repos } = await freshVault();
        await repos.incidents.create(content());
        await repos.incidents.create(content());
        await repos.incidents.create(content());
        await vault.remove('ledger', '000000002');
        expect(await repos.incidents.verify()).toMatchObject({ ok: false, reason: 'sequence' });
    });

    it('detects a current record edited outside its history', async () => {
        const { vault, repos } = await freshVault();
        const created = await repos.incidents.create(content());
        await vault.put('incident', created.id, {
            ...created,
            content: { ...created.content, title: 'Changed' },
            hash: 'f'.repeat(64),
        });
        const verdict = await repos.incidents.verify();
        expect(verdict.ok).toBe(true);
        expect(verdict.mismatchedIncidents).toEqual([created.incId]);
    });

    it('refuses to read a record whose ciphertext was altered', async () => {
        const { db, repos } = await freshVault();
        const created = await repos.incidents.create(content());
        const row = await db.records.get(`incident:${created.id}`);
        const bytes = new Uint8Array(row!.ct.slice(0));
        bytes[5]! ^= 0x01;
        await db.records.put({ ...row!, ct: bytes.buffer });
        await expect(repos.incidents.get(created.id)).rejects.toBeInstanceOf(DecryptionError);
    });

    it('moves to trash and restores, keeping the history', async () => {
        const { repos } = await freshVault();
        const created = await repos.incidents.create(content());
        await repos.incidents.trash(created.id, new Date('2026-04-01T00:00:00Z'));
        expect(await repos.incidents.list()).toHaveLength(0);
        expect(await repos.incidents.expiredTrash(new Date('2026-05-15T00:00:00Z'))).toHaveLength(1);
        await repos.incidents.restore(created.id);
        expect(await repos.incidents.list()).toHaveLength(1);
        expect((await repos.incidents.history(created.id)).map((h) => h.body.op)).toEqual([
            'create',
            'trash',
            'restore',
        ]);
    });

    it('rejects incomplete incidents', async () => {
        const { repos } = await freshVault();
        await expect(repos.incidents.create(content({ title: '' }))).rejects.toThrow();
        await expect(repos.incidents.create(content({ types: [] }))).rejects.toThrow();
    });
});
