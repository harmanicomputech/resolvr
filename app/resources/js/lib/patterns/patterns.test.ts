import { describe, expect, it } from 'vitest';

import type { Person } from '@/lib/model/schema';
import { incident } from '@/test/fixtures';

import { detectPatterns } from './detect';

const smith: Person = {
    id: 'p1',
    name: 'J. Smith',
    normalizedName: 'j smith',
    aliases: [],
    createdAt: '2026-01-01T00:00:00.000Z',
};
const people = new Map([[smith.id, smith]]);

const kinds = (list: ReturnType<typeof detectPatterns>) => list.map((p) => p.kind);

describe('detectPatterns', () => {
    it('finds nothing in an empty record', () => {
        expect(detectPatterns([], people)).toEqual([]);
    });

    it('notices the same person, and raises it at four incidents', () => {
        const two = [incident({ responsibleIds: ['p1'] }), incident({ responsibleIds: ['p1'] })];
        expect(detectPatterns(two, people)[0]).toMatchObject({
            kind: 'repeat-person',
            tone: 'notice',
            title: '2 of 2 incidents involve J. Smith',
        });
        const four = Array.from({ length: 4 }, () => incident({ responsibleIds: ['p1'] }));
        expect(detectPatterns(four, people)[0]!.tone).toBe('attention');
    });

    it('finds a recurring weekday (three Mondays)', () => {
        const mondays = ['2026-03-02', '2026-03-09', '2026-03-16'].map((d) =>
            incident({ occurredAt: `${d}T12:00:00.000Z` }),
        );
        expect(kinds(detectPatterns(mondays, people, { timeZone: 'UTC' }))).toContain('day-of-week');
    });

    it('finds escalating severity', () => {
        const list = [
            incident({ occurredAt: '2026-01-01T09:00:00.000Z', severity: 'low' }),
            incident({ occurredAt: '2026-01-08T09:00:00.000Z', severity: 'low' }),
            incident({ occurredAt: '2026-02-01T09:00:00.000Z', severity: 'high' }),
            incident({ occurredAt: '2026-02-08T09:00:00.000Z', severity: 'critical' }),
        ];
        const escalation = detectPatterns(list, people).find((p) => p.kind === 'escalation');
        expect(escalation?.incidentIds).toHaveLength(2);
    });

    it('finds incidents within 30 days after a formal report, not before or long after', () => {
        const report = incident({ occurredAt: '2026-03-01T09:00:00.000Z', reported: 'yes', reportedOn: '2026-03-02' });
        const soonAfter = incident({ occurredAt: '2026-03-20T09:00:00.000Z' });
        const longAfter = incident({ occurredAt: '2026-05-20T09:00:00.000Z' });
        const window = detectPatterns([report, soonAfter, longAfter], people).find(
            (p) => p.kind === 'retaliation-window',
        );
        expect(window?.incidentIds).toEqual([soonAfter.id]);
    });

    it('counts distinct types and corroborated incidents', () => {
        const list = [
            incident({ types: ['A', 'B'], witnesses: [{ personId: 'w', statement: 'not-asked' }] }),
            incident({ types: ['C'], witnesses: [{ personId: 'w', statement: 'given' }] }),
        ];
        expect(kinds(detectPatterns(list, people))).toEqual(expect.arrayContaining(['multi-type', 'witnesses']));
    });

    it('uses calm wording', () => {
        const list = Array.from({ length: 6 }, (_, i) =>
            incident({
                responsibleIds: ['p1'],
                severity: i < 3 ? 'low' : 'critical',
                occurredAt: `2026-03-0${i + 1}T09:00:00.000Z`,
                types: [`T${i}`],
            }),
        );
        const text = detectPatterns(list, people)
            .map((p) => `${p.title} ${p.detail}`)
            .join(' ');
        expect(text).not.toMatch(/court|win|guarantee|illegal|constitutes|AI/i);
    });
});
