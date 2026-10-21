import { describe, expect, it } from 'vitest';

import { incident } from '@/test/fixtures';

import { caseStats } from './stats';
import { caseSummary, dailyHeat, monthlyCounts, severityCounts, severityTrend } from './series';

const now = new Date(2026, 5, 17, 12); // Wed 17 June 2026, local

describe('dashboard series', () => {
    it('counts incidents per month for the last six months', () => {
        const list = [
            incident({ occurredAt: new Date(2026, 5, 2).toISOString() }),
            incident({ occurredAt: new Date(2026, 1, 10).toISOString() }),
            incident({ occurredAt: new Date(2025, 11, 1).toISOString() }),
        ];
        const months = monthlyCounts(list, 6, now, 'en-GB');
        expect(months.map((m) => m.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
        expect(months.map((m) => m.count)).toEqual([0, 1, 0, 0, 0, 1]);
    });

    it('counts severities', () => {
        expect(
            severityCounts([
                incident({ severity: 'high' }),
                incident({ severity: 'high' }),
                incident({ severity: 'low' }),
            ]),
        ).toEqual({ low: 1, medium: 0, high: 2, critical: 0 });
    });

    it('builds 16 Monday-first weeks ending this week', () => {
        const weeks = dailyHeat(
            [
                incident({ occurredAt: new Date(2026, 5, 15, 9).toISOString() }),
                incident({ occurredAt: new Date(2026, 5, 15, 17).toISOString() }),
            ],
            16,
            now,
        );
        expect(weeks).toHaveLength(16);
        const thisWeek = weeks[15]!;
        expect(thisWeek[0]!.date.getDate()).toBe(15); // Monday
        expect(thisWeek[0]!.count).toBe(2);
        expect(thisWeek[0]!.level).toBe(2);
        expect(thisWeek[3]!.future).toBe(true); // Thursday
        expect(weeks[0]![0]!.date.getDay()).toBe(1);
    });

    it('describes the severity trend', () => {
        const mk = (sev: 'low' | 'high' | 'critical', day: number) =>
            incident({ severity: sev, occurredAt: new Date(2026, 0, day).toISOString() });
        expect(severityTrend([mk('low', 1), mk('low', 2)])).toBe('too-early');
        expect(severityTrend([mk('low', 1), mk('low', 2), mk('high', 3), mk('critical', 4)])).toBe('more-severe');
        expect(severityTrend([mk('critical', 1), mk('high', 2), mk('low', 3), mk('low', 4)])).toBe('less-severe');
    });

    it('writes a calm one-sentence summary', () => {
        const smith = {
            id: 'p1',
            name: 'J. Smith',
            normalizedName: 'j smith',
            aliases: [],
            createdAt: now.toISOString(),
        };
        const people = new Map([[smith.id, smith]]);
        const list = [
            incident({ severity: 'low', occurredAt: new Date(2026, 1, 1).toISOString(), responsibleIds: ['p1'] }),
            incident({ severity: 'low', occurredAt: new Date(2026, 2, 1).toISOString(), responsibleIds: ['p1'] }),
            incident({ severity: 'high', occurredAt: new Date(2026, 3, 1).toISOString(), responsibleIds: ['p1'] }),
            incident({ severity: 'critical', occurredAt: new Date(2026, 5, 1).toISOString() }),
        ];
        expect(caseSummary(caseStats(list, people, now), list)).toBe(
            '4 incidents over 4 months, mostly involving J. Smith, trending more severe.',
        );
        expect(caseSummary(caseStats([], people, now), [])).toMatch(/^Nothing logged yet/);
    });
});
