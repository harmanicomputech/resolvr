import { describe, expect, it } from 'vitest';

import { incident } from '@/test/fixtures';

import { addedNotes, diffContent } from './diff';
import { emptyFilter, filterIncidents } from './filter';

const smith = {
    id: 'p1',
    name: 'J. Smith',
    normalizedName: 'j smith',
    aliases: [],
    createdAt: '2026-01-01T00:00:00.000Z',
};
const people = new Map([[smith.id, smith]]);

describe('incident filters', () => {
    const list = [
        incident(
            {
                title: 'Shouted at',
                severity: 'high',
                occurredAt: '2026-03-02T10:00:00.000Z',
                responsibleIds: ['p1'],
                types: ['Verbal Harassment'],
            },
            { incId: 'INC-001' },
        ),
        incident(
            {
                title: 'Left out of meeting',
                severity: 'low',
                occurredAt: '2026-04-10T10:00:00.000Z',
                types: ['Exclusion / Isolation'],
                reported: 'yes',
            },
            { incId: 'INC-002' },
        ),
        incident(
            {
                title: 'Threat',
                severity: 'critical',
                occurredAt: '2026-02-01T10:00:00.000Z',
                responsibleIds: ['p1'],
                types: ['Intimidation / Threats'],
            },
            { incId: 'INC-003' },
        ),
    ];

    it('searches text, ids and names', () => {
        expect(filterIncidents(list, { ...emptyFilter, query: 'smith' }, 'newest', people).map((i) => i.incId)).toEqual(
            ['INC-001', 'INC-003'],
        );
        expect(
            filterIncidents(list, { ...emptyFilter, query: 'inc-002' }, 'newest', people).map((i) => i.incId),
        ).toEqual(['INC-002']);
    });

    it('filters by severity, person, dates and reporting, and sorts', () => {
        expect(
            filterIncidents(list, { ...emptyFilter, severities: ['low', 'high'] }, 'oldest', people).map(
                (i) => i.incId,
            ),
        ).toEqual(['INC-001', 'INC-002']);
        expect(
            filterIncidents(list, { ...emptyFilter, personIds: ['p1'] }, 'severity', people).map((i) => i.incId),
        ).toEqual(['INC-003', 'INC-001']);
        expect(
            filterIncidents(list, { ...emptyFilter, from: '2026-03-01', to: '2026-03-31' }, 'newest', people).map(
                (i) => i.incId,
            ),
        ).toEqual(['INC-001']);
        expect(
            filterIncidents(list, { ...emptyFilter, reported: 'yes' }, 'newest', people).map((i) => i.incId),
        ).toEqual(['INC-002']);
    });
});

describe('version diffs', () => {
    it('lists changed fields in plain words', () => {
        const a = incident({ title: 'Shouted at', severity: 'medium', responsibleIds: [] }).content;
        const b = { ...a, title: 'Shouted at in stand-up', severity: 'high' as const, responsibleIds: ['p1'] };
        const changes = diffContent(a, b, { people });
        expect(changes.map((c) => c.label)).toEqual(['Title', 'Severity', 'Responsible']);
        expect(changes[2]).toMatchObject({ before: '–', after: 'J. Smith' });
    });

    it('finds added notes', () => {
        const n = { id: 'n1', at: '2026-01-01T00:00:00.000Z', text: 'x' };
        expect(addedNotes([], [n])).toEqual([n]);
        expect(addedNotes([n], [n])).toEqual([]);
    });
});
