import { describe, expect, it } from 'vitest';

import { content, freshVault } from '@/test/fixtures';

import { exportFingerprint, fingerprintAt, parseVerification, verificationUrl } from './fingerprint';

describe('export fingerprints', () => {
    it('can be recomputed from the ledger after later edits', async () => {
        const { repos } = await freshVault();
        const a = await repos.incidents.create(content({ title: 'One' }));
        const b = await repos.incidents.create(content({ title: 'Two' }));
        const ledger = await repos.incidents.ledger();
        const head = ledger.at(-1)!.hash;
        const fingerprint = await exportFingerprint({
            head,
            incidents: [a, b].map((i) => ({ incId: i.incId, hash: i.hash })),
            files: ['f1'],
        });

        // The record changes after the export...
        await repos.incidents.update(a.id, content({ title: 'One, edited' }));
        await repos.incidents.annotate(b.id, 'later note');

        // ...and the original fingerprint still checks out against the history.
        const url = verificationUrl('https://app.example', fingerprint, head, [a.incId, b.incId]);
        const parsed = parseVerification(new URL(url).hash)!;
        const again = await fingerprintAt(await repos.incidents.ledger(), parsed.headPrefix, parsed.incIds, ['f1']);
        expect(again?.fingerprint).toBe(parsed.fingerprint);

        // A different file set, or a head that is not in this record, does not.
        expect(
            (await fingerprintAt(await repos.incidents.ledger(), parsed.headPrefix, parsed.incIds, ['f2']))
                ?.fingerprint,
        ).not.toBe(fingerprint);
        expect(
            await fingerprintAt(await repos.incidents.ledger(), '0123456789abcdef', parsed.incIds, ['f1']),
        ).toBeNull();
    });
});
