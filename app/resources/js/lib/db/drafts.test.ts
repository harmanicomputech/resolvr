import { describe, expect, it } from 'vitest';

import { freshVault } from '@/test/fixtures';

import { commitForm, formFromIncident } from './commit-form';

describe('drafts and the log form', () => {
    it('saves drafts encrypted and discards their files', async () => {
        const { db, repos } = await freshVault();
        const file = await repos.files.add(new File([new Uint8Array([1, 2, 3])], 'voice.webm', { type: 'audio/webm' }));
        const draft = repos.drafts.create({ quick: true });
        draft.form.title = 'Meeting with my manager';
        draft.form.fileIds = [file.id];
        await repos.drafts.save(draft);

        const raw = await db.records.get(`draft:${draft.id}`);
        expect(new TextDecoder().decode(raw!.ct)).not.toContain('Meeting with');
        expect((await repos.drafts.list())[0]?.form.title).toBe('Meeting with my manager');

        await repos.drafts.remove(draft.id, { discardFiles: true });
        expect(await repos.drafts.list()).toHaveLength(0);
        expect(await repos.files.get(file.id)).toBeUndefined();
    });

    it('commits a form as an incident with people and linked files, and round-trips for editing', async () => {
        const { repos } = await freshVault();
        const file = await repos.files.add(new File(['x'], 'shot.png', { type: 'image/png' }));
        const form = repos.drafts.create().form;
        Object.assign(form, {
            title: 'Shouted at',
            description: 'He raised his voice at me in front of the team.',
            occurredLocal: '2026-03-02T09:30',
            types: ['Verbal Harassment'],
            severity: 'high',
            responsible: ['J. Smith', 'j smith'],
            witnesses: [{ name: 'Ann Lee', statement: 'requested' }],
            reported: 'no',
            reportedTo: 'ignored when not reported',
            whyNotReported: 'Fear of retaliation',
            fileIds: [file.id],
        });
        const incident = await commitForm(form, repos);
        expect(incident.incId).toBe('INC-001');
        expect(incident.content.responsibleIds).toHaveLength(1);
        expect(incident.content.reportedTo).toBe('');
        expect((await repos.files.get(file.id))?.incidentIds).toEqual([incident.id]);

        const people = new Map((await repos.people.list()).map((p) => [p.id, p]));
        const back = formFromIncident(incident, people);
        expect(back.responsible).toEqual(['J. Smith']);
        expect(back.witnesses).toEqual([{ name: 'Ann Lee', statement: 'requested' }]);
        expect(back.occurredLocal).toBe('2026-03-02T09:30');

        back.fileIds = [];
        const edited = await commitForm(back, repos, { incidentId: incident.id });
        expect(edited.version).toBe(2);
        expect((await repos.files.get(file.id))?.incidentIds).toEqual([]);
    });
});
