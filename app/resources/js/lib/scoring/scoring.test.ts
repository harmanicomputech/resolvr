import { describe, expect, it } from 'vitest';

import type { Incident } from '@/lib/model/schema';
import { incident } from '@/test/fixtures';

import { caseReadiness } from './readiness';
import { scoreParts } from './score';
import { caseStats } from './stats';

/* eslint-disable */
// Verbatim port of the prototype's calcScoreParts (docs/reference/prototype-v2.html),
// fed the prototype's data shape, so the new implementation can be checked against it.
function prototypeCalcScoreParts(incidents: any[], vault: any[]) {
    if (!incidents.length) {
        return { total: 0, incidents: 0, witnesses: 0, descriptions: 0, files: 0, variety: 0, notes: 0, severity: 0 };
    }
    const wits = [
        ...new Set(
            incidents.flatMap((i) =>
                i.witnesses
                    ? i.witnesses
                          .split(',')
                          .map((w: string) => w.trim())
                          .filter(Boolean)
                    : [],
            ),
        ),
    ].length;
    const longDesc = incidents.filter((i) => i.description && i.description.length > 100).length;
    const types = [
        ...new Set(
            incidents.flatMap((i) =>
                i.type
                    ? String(i.type)
                          .split(';')
                          .map((t) => t.trim())
                          .filter(Boolean)
                    : [],
            ),
        ),
    ].length;
    const sevPts = incidents.reduce(
        (s, i) => s + (({ critical: 8, high: 6, medium: 3, low: 1 } as any)[i.severity] || 0),
        0,
    );
    const parts: any = {
        incidents: Math.min(incidents.length * 5, 25),
        witnesses: Math.min(wits * 5, 20),
        descriptions: Math.min(longDesc * 3, 15),
        files: Math.min(vault.length * 3, 10),
        variety: types >= 2 ? 5 : 0,
        notes: incidents.some((i) => i.notes && i.notes.length) ? 5 : 0,
        severity: Math.min(sevPts, 20),
    };
    parts.total = Math.min(
        Math.round(
            parts.incidents +
                parts.witnesses +
                parts.descriptions +
                parts.files +
                parts.variety +
                parts.notes +
                parts.severity,
        ),
        100,
    );
    return parts;
}
/* eslint-enable */

/** Deterministic pseudo-random generator so the comparison is repeatable. */
function rng(seed: number) {
    return () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
}

describe('scoreParts', () => {
    it('matches the prototype on 200 random records', () => {
        const rand = rng(42);
        const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
        const names = ['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Flo', 'Gus'];
        const typePool = [
            'Verbal Harassment',
            'Retaliation for Complaint / Protected Activity',
            'Age Discrimination (40+)',
            'Hostile Work Environment',
        ];

        for (let run = 0; run < 200; run++) {
            const count = Math.floor(rand() * 9);
            const old: Record<string, unknown>[] = [];
            const next: Incident[] = [];
            for (let i = 0; i < count; i++) {
                const witnesses = names.filter(() => rand() < 0.2);
                const types = typePool.filter(() => rand() < 0.4);
                const severity = pick(['low', 'medium', 'high', 'critical'] as const);
                const description = 'x'.repeat(Math.floor(rand() * 200) + 1);
                const hasNote = rand() < 0.2;
                old.push({
                    witnesses: witnesses.join(', '),
                    type: types.join('; '),
                    severity,
                    description,
                    notes: hasNote ? [{ ts: '', text: 'n' }] : [],
                });
                next.push(
                    incident(
                        {
                            types: types.length ? types : ['Other'],
                            severity,
                            description,
                            witnesses: witnesses.map((n) => ({ personId: n, statement: 'not-asked' as const })),
                        },
                        { annotations: hasNote ? [{ id: 'a', at: '2026-01-01T00:00:00.000Z', text: 'n' }] : [] },
                    ),
                );
                // The new model requires at least one type; mirror that in the prototype data.
                if (!types.length) old[old.length - 1]!.type = 'Other';
            }
            const files = Math.floor(rand() * 6);
            expect(scoreParts(next, files)).toEqual(prototypeCalcScoreParts(old, Array(files).fill({})));
        }
    });

    it('caps each part and the total', () => {
        const many = Array.from({ length: 20 }, (_, i) =>
            incident(
                {
                    severity: 'critical',
                    description: 'y'.repeat(150),
                    witnesses: [{ personId: `p${i}`, statement: 'not-asked' }],
                    types: ['A', 'B'],
                },
                { annotations: [{ id: 'x', at: '2026-01-01T00:00:00.000Z', text: 'n' }] },
            ),
        );
        expect(scoreParts(many, 50)).toEqual({
            incidents: 25,
            witnesses: 20,
            descriptions: 15,
            files: 10,
            variety: 5,
            notes: 5,
            severity: 20,
            total: 100,
        });
    });
});

describe('caseReadiness', () => {
    it('starts at nothing and suggests the first step', () => {
        const r = caseReadiness([], 0, 0);
        expect(r.current).toBe(-1);
        expect(r.nextStep).toMatch(/first incident/);
    });

    it('reaches Pattern found with three incidents', () => {
        const r = caseReadiness([incident(), incident(), incident()], 30, 0);
        expect(r.stages.map((s) => s.done)).toEqual([true, true, false, false]);
        expect(r.nextStep).toMatch(/witnesses/i);
    });

    it('reaches Legal ready only with a high score and a formal report', () => {
        const list = [incident({ reported: 'yes' }), incident(), incident()];
        expect(caseReadiness(list, 80, 1).current).toBe(3);
        expect(caseReadiness([incident(), incident(), incident()], 80, 1).current).toBe(2);
    });
});

describe('caseStats', () => {
    it('counts, finds the most-mentioned person and days since the last incident', () => {
        const list = [
            incident({ occurredAt: '2026-03-01T10:00:00.000Z', responsibleIds: ['p1'], severity: 'high' }),
            incident({ occurredAt: '2026-03-10T10:00:00.000Z', responsibleIds: ['p1', 'p2'] }),
            incident({ occurredAt: '2026-02-01T10:00:00.000Z', responsibleIds: ['p2', 'p1'], severity: 'critical' }),
        ];
        const stats = caseStats(list, new Map(), new Date('2026-03-15T10:00:00.000Z'));
        expect(stats).toMatchObject({ total: 3, serious: 2, daysSinceLast: 5, firstAt: '2026-02-01T10:00:00.000Z' });
        expect(stats.topPerson).toMatchObject({ personId: 'p1', count: 3 });
    });
});
