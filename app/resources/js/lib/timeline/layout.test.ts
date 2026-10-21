import { describe, expect, it } from 'vitest';

import { incident } from '@/test/fixtures';

import { categoryOf, lanesFor, reportMarkers, severityTrend } from './layout';

describe('timeline layout', () => {
    it('picks one category per incident, retaliation first', () => {
        expect(categoryOf(['Verbal Harassment'])).toBe('harassment');
        expect(categoryOf(['Verbal Harassment', 'Retaliation for Complaint / Protected Activity'])).toBe('retaliation');
        expect(categoryOf(['Other'])).toBe('other');
    });

    it('makes lanes for the people most involved', () => {
        const people = new Map([
            ['a', { id: 'a', name: 'A', normalizedName: 'a', aliases: [], createdAt: '2026-01-01T00:00:00.000Z' }],
            ['b', { id: 'b', name: 'B', normalizedName: 'b', aliases: [], createdAt: '2026-01-01T00:00:00.000Z' }],
        ]);
        const list = [
            incident({ responsibleIds: ['a'] }),
            incident({ responsibleIds: ['a'] }),
            incident({ responsibleIds: ['b'] }),
            incident({}),
        ];
        const lanes = lanesFor(list, people, 1);
        expect(lanes.map((l) => [l.label, l.incidentIds.length])).toEqual([
            ['A', 2],
            ['Others', 1],
            ['No one named', 1],
        ]);
    });

    it('marks reports with a 30-day window and smooths severity', () => {
        const reported = incident({ reported: 'yes', reportedOn: '2026-03-02', reportedTo: 'HR' });
        const markers = reportMarkers([reported, incident({ reported: 'no' })]);
        expect(markers).toHaveLength(1);
        expect(Math.round((markers[0]!.windowEnd.getTime() - markers[0]!.at.getTime()) / 86_400_000)).toBe(30);
        const trend = severityTrend(
            [
                incident({ severity: 'low', occurredAt: '2026-01-01T00:00:00.000Z' }),
                incident({ severity: 'critical', occurredAt: '2026-01-02T00:00:00.000Z' }),
            ],
            2,
        );
        expect(trend.map((t) => t.value)).toEqual([1, 2.5]);
    });
});
