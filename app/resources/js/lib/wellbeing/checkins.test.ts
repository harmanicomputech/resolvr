import { expect, test } from 'vitest';

import { freshVault } from '@/test/fixtures';

import { listCheckIns, localDate, saveCheckIn, summarise } from './checkins';

test('one check-in per day, editable that day, and stored encrypted', async () => {
    const { repos, db } = await freshVault();
    await saveCheckIn(repos, 2, 'Rough meeting', new Date('2026-10-20T09:00:00'));
    await saveCheckIn(repos, 3, 'Better after lunch', new Date('2026-10-20T15:00:00'));
    await saveCheckIn(repos, 4, '', new Date('2026-10-21T09:00:00'));
    const all = await listCheckIns(repos);
    expect(all.map((c) => [c.date, c.mood])).toEqual([
        ['2026-10-20', 3],
        ['2026-10-21', 4],
    ]);
    const raw = JSON.stringify(await db.records.where('kind').equals('checkin').toArray());
    expect(raw).not.toContain('lunch');
});

test('summaries are gentle: averages and direction, no streaks', () => {
    const day = (i: number, mood: number) => ({
        date: `2026-09-${String(i).padStart(2, '0')}`,
        mood,
        note: '',
        at: '',
    });
    const s = summarise([
        ...[1, 2, 3, 4, 5, 6, 7].map((i) => day(i, 4)),
        ...[8, 9, 10, 11, 12, 13, 14].map((i) => day(i, 2)),
    ]);
    expect(s.change).toBe('lower');
    expect(s.days).toBe(14);
    expect(s.lowDays).toBe(7);
    expect(s.byMonth).toEqual([{ month: '2026-09', average: 3, days: 14 }]);
    expect(Object.keys(s)).not.toContain('streak');
    expect(localDate(new Date('2026-01-05T12:00:00'))).toBe('2026-01-05');
});
