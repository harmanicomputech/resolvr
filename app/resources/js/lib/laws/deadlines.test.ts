import { describe, expect, test } from 'vitest';

import { incident } from '@/test/fixtures';

import { lawPacks, legalCoverage } from './coverage';
import { filingDeadlines } from './deadlines';

const at = (iso: string, types: string[]) => incident({ occurredAt: iso, types });

describe('jurisdiction packs', () => {
    test.each(Object.values(lawPacks))('$id pack is complete and labelled as general information', (pack) => {
        expect(pack.version).toMatch(/^\d{4}\.\d+$/);
        expect(pack.disclaimer).toMatch(/not legal advice/i);
        expect(pack.lawyerHelp.url).toMatch(/^https:\/\//);
        expect(pack.support.length).toBeGreaterThan(0);
        for (const s of pack.statutes) {
            expect(s.summary.length).toBeGreaterThan(40);
            expect(s.triggers.length).toBeGreaterThan(0);
            if (s.limitation) expect(s.limitation.days).toBeGreaterThan(0);
            if (s.agency) expect(s.agency.url).toMatch(/^https:\/\//);
        }
    });

    test('each pack responds to harassment', () => {
        for (const pack of Object.values(lawPacks)) {
            expect(legalCoverage(['Sexual Harassment'], pack).statutes.some((s) => s.active)).toBe(true);
        }
    });

    test('"Wage" does not suggest age discrimination', () => {
        const active = legalCoverage(['Wage / Hour Violation'], lawPacks.uk).statutes.filter((s) => s.active);
        expect(active.map((s) => s.statute.id)).toEqual(['wages']);
    });
});

describe('filing deadlines', () => {
    const today = new Date('2026-10-22T12:00:00');

    test('counts from the first relevant incident, soonest first', () => {
        const { deadlines, next, somePassed } = filingDeadlines(
            [
                at('2026-09-01T10:00:00', ['Verbal Harassment']),
                at('2026-10-01T10:00:00', ['Unsafe Working Conditions']),
            ],
            lawPacks.us,
            today,
        );
        expect(deadlines[0]!.statute.id).toBe('osha'); // 30 days from 1 Oct
        expect(next?.basis).toBe('first');
        expect(next?.daysLeft).toBe(9);
        expect(somePassed).toBe(false);
        const titleVii = deadlines.find((d) => d.statute.id === 'title-vii')!;
        expect(titleVii.earliest.toDateString()).toBe(new Date('2027-02-28T00:00:00').toDateString());
    });

    test('falls back to the most recent incident once an early limit has passed', () => {
        const { next, somePassed } = filingDeadlines(
            [at('2025-01-10T10:00:00', ['Verbal Harassment']), at('2026-10-10T10:00:00', ['Verbal Harassment'])],
            lawPacks.us,
            today,
        );
        expect(somePassed).toBe(true);
        expect(next?.basis).toBe('latest');
        expect(next?.deadline.statute.id).toBe('title-vii');
    });

    test('ignores deleted incidents and limits that do not run from an incident', () => {
        const deleted = {
            ...at('2026-10-01T10:00:00', ['Pay / Compensation Discrimination']),
            deletedAt: '2026-10-02T00:00:00.000Z',
        };
        expect(filingDeadlines([deleted], lawPacks.us, today).deadlines).toHaveLength(0);
        const pay = filingDeadlines([at('2026-10-01T10:00:00', ['Equal Pay'])], lawPacks.uk, today);
        expect(pay.deadlines.map((d) => d.statute.id)).not.toContain('equal-pay');
    });

    test('nothing to show for a record with no matching laws', () => {
        expect(filingDeadlines([at('2026-10-01T10:00:00', ['Other'])], lawPacks.ng, today).next).toBeNull();
    });
});
