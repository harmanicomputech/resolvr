import type { Incident, Person } from '../model/schema';

export interface CaseStats {
    total: number;
    serious: number;
    daysSinceLast: number | null;
    topPerson: { person: Person | undefined; personId: string; count: number } | null;
    firstAt: string | null;
    lastAt: string | null;
}

const DAY = 24 * 60 * 60 * 1000;

export function caseStats(incidents: Incident[], peopleById: Map<string, Person>, now = new Date()): CaseStats {
    const sorted = [...incidents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const counts = new Map<string, number>();
    incidents.forEach((i) => i.content.responsibleIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const last = sorted.at(-1);

    return {
        total: incidents.length,
        serious: incidents.filter((i) => i.content.severity === 'high' || i.content.severity === 'critical').length,
        daysSinceLast: last ? Math.max(0, Math.floor((now.getTime() - Date.parse(last.occurredAt)) / DAY)) : null,
        topPerson: top ? { personId: top[0], person: peopleById.get(top[0]), count: top[1] } : null,
        firstAt: sorted[0]?.occurredAt ?? null,
        lastAt: last?.occurredAt ?? null,
    };
}
