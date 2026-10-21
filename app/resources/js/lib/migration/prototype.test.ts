import { describe, expect, it } from 'vitest';

import { freshVault } from '@/test/fixtures';

import { importPrototype } from './prototype';

const sampleExport = {
    app: 'Resolvr',
    version: '2.0',
    exported: '2026-04-01T10:00:00.000Z',
    incidents: [
        {
            id: 1700000002,
            incId: 'INC-007',
            timestamp: '2026-03-10T09:30:00.000Z',
            loggedAt: '2026-03-10T10:00:00.000Z',
            title: 'Shift changed after report',
            type: 'Retaliation for Complaint / Protected Activity; Schedule Manipulation / Hours Reduction',
            severity: 'high',
            location: 'Warehouse',
            person: 'J. Smith',
            description: 'My shifts were cut the week after I reported.',
            witnesses: 'Ann Lee, Bo Diaz',
            reported: 'yes',
            reportedTo: 'HR',
            reportedDate: '2026-03-02',
            frequency: '2–4 times — starting to be a pattern',
            emotionalImpact: 'Anxious, Powerless',
            evidenceCaptured: 'Screenshot taken',
            notes: [{ ts: '2026-03-11T08:00:00.000Z', text: 'Rota posted again.' }],
        },
        {
            id: 1700000001,
            incId: 'INC-003',
            timestamp: '2026-02-20T14:00:00.000Z',
            title: 'Comment in meeting',
            type: 'Verbal Harassment',
            severity: 'medium',
            person: 'j smith',
            description: 'Mocked my accent in front of the team.',
            witnesses: '',
        },
        { title: 'Broken', severity: 'unknown' },
    ],
    vault: [
        {
            id: 1,
            name: 'rota.png',
            type: 'image/png',
            data: 'data:image/png;base64,aGVsbG8=',
            date: '2026-03-10T11:00:00.000Z',
        },
    ],
    settings: { autoLock: 2, theme: 'light', stealth: false },
};

describe('importPrototype', () => {
    it('imports incidents, people, notes and files from a prototype backup', async () => {
        const { repos } = await freshVault();
        const report = await importPrototype(sampleExport, repos, new Date('2026-04-02T00:00:00.000Z'));

        expect(report.incidents).toBe(3);
        expect(report.files).toBe(1);
        // "J. Smith" and "j smith" are the same person; plus two witnesses.
        expect(report.people).toBe(3);

        const incidents = await repos.incidents.list();
        const shift = incidents.find((i) => i.incId === 'INC-007')!;
        expect(shift.source).toBe('import');
        expect(shift.content.types).toHaveLength(2);
        expect(shift.content.witnesses).toHaveLength(2);
        expect(shift.content.reportedOn).toBe('2026-03-02');
        expect(shift.content.emotionalImpacts).toEqual(['Anxious', 'Powerless']);
        expect(shift.createdAt).toBe('2026-03-10T10:00:00.000Z');
        expect(shift.annotations[0]!.text).toMatch(/Rota posted again/);

        // A malformed entry is imported with safe defaults rather than lost.
        expect(incidents.find((i) => i.content.title === 'Broken')!.content.severity).toBe('medium');

        const file = (await repos.files.list())[0]!;
        expect(file.name).toBe('rota.png');
        expect(await (await repos.files.open(file.id))!.text()).toBe('hello');
    });

    it('keeps old INC numbers and never issues one twice', async () => {
        const { repos } = await freshVault();
        await importPrototype(sampleExport, repos);
        const imported = (await repos.incidents.list()).map((i) => Number(i.incId.slice(4)));
        expect(imported).toEqual(expect.arrayContaining([3, 7]));
        const next = await repos.incidents.create({
            title: 'New',
            types: ['Other'],
            severity: 'low',
            occurredAt: '2026-04-03T09:00:00.000Z',
            description: 'x',
        });
        expect(Number(next.incId.slice(4))).toBeGreaterThan(Math.max(...imported));
        expect(new Set([...imported, Number(next.incId.slice(4))]).size).toBe(imported.length + 1);
    });

    it('starts the tamper-evident history at import, in date order', async () => {
        const { repos } = await freshVault();
        await importPrototype(sampleExport, repos);
        const ledger = await repos.incidents.ledger();
        expect(ledger[0]!.body).toMatchObject({ op: 'import', incId: 'INC-003' });
        expect((await repos.incidents.verify()).ok).toBe(true);
    });

    it('rejects files that are not a backup', async () => {
        const { repos } = await freshVault();
        await expect(importPrototype({ incidents: 'nope' }, repos)).rejects.toThrow();
    });
});
