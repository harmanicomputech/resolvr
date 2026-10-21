import type { Person } from '../model/schema';
import type { Incident } from '../model/schema';
import { severities, type Severity } from '../model/catalog';
import type { CaseStats } from './stats';

/*
 * Chart series and the plain-English case summary for the dashboard.
 * Pure functions over decrypted incidents; dates use the device's time zone.
 */

const DAY = 24 * 60 * 60 * 1000;
const rank: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export interface MonthCount {
    /** First day of the month, local time. */
    start: Date;
    label: string;
    count: number;
}

/** Incidents per calendar month for the last `months` months, oldest first. */
export function monthlyCounts(incidents: Incident[], months = 6, now = new Date(), locale?: string): MonthCount[] {
    const out: MonthCount[] = [];
    for (let i = months - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({ start, label: start.toLocaleDateString(locale, { month: 'short' }), count: 0 });
    }
    for (const incident of incidents) {
        const at = new Date(incident.occurredAt);
        const slot = out.find(
            (m) => m.start.getFullYear() === at.getFullYear() && m.start.getMonth() === at.getMonth(),
        );
        if (slot) slot.count++;
    }
    return out;
}

export function severityCounts(incidents: Incident[]): Record<Severity, number> {
    const counts = Object.fromEntries(severities.map((s) => [s, 0])) as Record<Severity, number>;
    for (const incident of incidents) counts[incident.content.severity]++;
    return counts;
}

export interface HeatDay {
    date: Date;
    count: number;
    /** 0 = none, 1–4 = ramp step (4 means four or more). */
    level: 0 | 1 | 2 | 3 | 4;
    future: boolean;
}

/**
 * The last `weeks` weeks as columns of 7 days (Monday first), ending with the
 * current week. Days after today are marked `future`.
 */
export function dailyHeat(incidents: Incident[], weeks = 16, now = new Date()): HeatDay[][] {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayOffset = (today.getDay() + 6) % 7;
    const firstMonday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - mondayOffset - (weeks - 1) * 7,
    );
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const counts = new Map<string, number>();
    for (const incident of incidents) {
        const k = key(new Date(incident.occurredAt));
        counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from({ length: weeks }, (_, w) =>
        Array.from({ length: 7 }, (_, d) => {
            const date = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + w * 7 + d);
            const count = counts.get(key(date)) ?? 0;
            return { date, count, level: Math.min(count, 4) as HeatDay['level'], future: date > today };
        }),
    );
}

export type Trend = 'more-severe' | 'less-severe' | 'steady' | 'too-early';

/** Compare average severity of the older and newer halves (needs four or more incidents). */
export function severityTrend(incidents: Incident[]): Trend {
    if (incidents.length < 4) return 'too-early';
    const sorted = [...incidents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const half = Math.floor(sorted.length / 2);
    const avg = (list: Incident[]) => list.reduce((sum, i) => sum + rank[i.content.severity], 0) / list.length;
    const diff = avg(sorted.slice(sorted.length - half)) - avg(sorted.slice(0, half));
    if (diff >= 0.5) return 'more-severe';
    if (diff <= -0.5) return 'less-severe';
    return 'steady';
}

function span(firstAt: string, lastAt: string): string {
    const days = Math.max(1, Math.round((Date.parse(lastAt) - Date.parse(firstAt)) / DAY));
    if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`;
    if (days < 60) return `${Math.round(days / 7)} weeks`;
    const months = Math.round(days / 30.4);
    return months < 24 ? `${months} months` : `${Math.round(months / 12)} years`;
}

/**
 * One calm sentence describing the case, e.g. "12 incidents over 4 months,
 * mostly involving J. Smith, trending more severe."
 */
export function caseSummary(stats: CaseStats, incidents: Incident[]): string {
    if (!stats.total) return 'Nothing logged yet. When something happens, write it down while it is fresh.';
    const parts = [`${stats.total} ${stats.total === 1 ? 'incident' : 'incidents'}`];
    if (stats.total > 1 && stats.firstAt && stats.lastAt) parts[0] += ` over ${span(stats.firstAt, stats.lastAt)}`;
    const person: Person | undefined = stats.topPerson?.person;
    if (person && stats.topPerson && stats.topPerson.count >= Math.max(2, Math.ceil(stats.total / 2))) {
        parts.push(`${stats.topPerson.count === stats.total ? 'all' : 'mostly'} involving ${person.name}`);
    }
    const trend = severityTrend(incidents);
    if (trend === 'more-severe') parts.push('trending more severe');
    else if (trend === 'less-severe') parts.push('recently less severe');
    return `${parts.join(', ')}.`;
}

/** Morning / afternoon / evening greeting. */
export function greeting(now = new Date()): string {
    const h = now.getHours();
    return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
