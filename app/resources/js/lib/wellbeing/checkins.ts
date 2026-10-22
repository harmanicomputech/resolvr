import type { Repositories } from '../db';
import { checkInSchema, type CheckIn } from '../model/schema';

/**
 * Daily check-ins (P3.3): private, encrypted like everything else, one per
 * local day. No streaks, scores or reminders of missed days.
 */

export const moodLabels = ['Very low', 'Low', 'Okay', 'Good', 'Very good'] as const;

export const localDate = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function listCheckIns(repos: Repositories): Promise<CheckIn[]> {
    return (await repos.vault.list<CheckIn>('checkin')).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveCheckIn(repos: Repositories, mood: number, note: string, now = new Date()): Promise<CheckIn> {
    const entry = checkInSchema.parse({ date: localDate(now), mood, note, at: now.toISOString() });
    await repos.vault.put('checkin', entry.date, entry);
    return entry;
}

export interface WellbeingSummary {
    days: number;
    average: number | null;
    /** Average of the most recent 7 check-ins compared with the 7 before. */
    change: 'lower' | 'steady' | 'higher' | null;
    byMonth: { month: string; average: number; days: number }[];
    lowDays: number;
}

export function summarise(checkIns: CheckIn[]): WellbeingSummary {
    const avg = (xs: CheckIn[]) => (xs.length ? xs.reduce((n, c) => n + c.mood, 0) / xs.length : null);
    const recent = checkIns.slice(-7);
    const before = checkIns.slice(-14, -7);
    const a = avg(recent);
    const b = avg(before);
    const change =
        a === null || b === null || before.length < 3
            ? null
            : a - b <= -0.5
              ? 'lower'
              : a - b >= 0.5
                ? 'higher'
                : 'steady';
    const months = new Map<string, CheckIn[]>();
    for (const c of checkIns) months.set(c.date.slice(0, 7), [...(months.get(c.date.slice(0, 7)) ?? []), c]);
    return {
        days: checkIns.length,
        average: avg(checkIns),
        change,
        byMonth: [...months].map(([month, xs]) => ({ month, average: avg(xs)!, days: xs.length })),
        lowDays: checkIns.filter((c) => c.mood <= 2).length,
    };
}
