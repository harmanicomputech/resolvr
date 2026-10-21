import { severityRank } from '../model/catalog';
import type { Incident, Person } from '../model/schema';

/**
 * Pattern detection, ported from the prototype. Returns structured findings
 * (with the incidents involved, so the timeline can highlight them) and calm,
 * factual wording. Findings describe the record; they are not legal opinions.
 */

export type PatternKind =
    'repeat-person' | 'day-of-week' | 'escalation' | 'retaliation-window' | 'multi-type' | 'witnesses';
export type PatternTone = 'attention' | 'notice' | 'info' | 'positive';

export interface Pattern {
    kind: PatternKind;
    tone: PatternTone;
    title: string;
    detail: string;
    incidentIds: string[];
}

const DAY = 24 * 60 * 60 * 1000;
export const RETALIATION_WINDOW_DAYS = 30;

export function detectPatterns(
    incidents: Incident[],
    peopleById: Map<string, Person>,
    options: { timeZone?: string } = {},
): Pattern[] {
    if (!incidents.length) return [];
    const patterns: Pattern[] = [];
    const total = incidents.length;

    // 1. The same person involved repeatedly (first person responsible, as in the prototype).
    const byPerson = new Map<string, Incident[]>();
    incidents.forEach((i) => {
        const first = i.content.responsibleIds[0];
        if (first) byPerson.set(first, [...(byPerson.get(first) ?? []), i]);
    });
    const [topId, topIncidents] = [...byPerson.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
    if (topId && topIncidents && topIncidents.length >= 2) {
        const name = peopleById.get(topId)?.name ?? 'the same person';
        patterns.push({
            kind: 'repeat-person',
            tone: topIncidents.length >= 4 ? 'attention' : 'notice',
            title: `${topIncidents.length} of ${total} incidents involve ${name}`,
            detail: `${Math.round((topIncidents.length / total) * 100)}% of your record involves the same person.`,
            incidentIds: topIncidents.map((i) => i.id),
        });
    }

    // 2. A recurring day of the week.
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: options.timeZone });
    const byDay = new Map<string, Incident[]>();
    incidents.forEach((i) => {
        const day = weekday.format(new Date(i.occurredAt));
        byDay.set(day, [...(byDay.get(day) ?? []), i]);
    });
    const [topDay, dayIncidents] = [...byDay.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
    if (topDay && dayIncidents && dayIncidents.length >= 3) {
        patterns.push({
            kind: 'day-of-week',
            tone: 'notice',
            title: `${dayIncidents.length} incidents happened on a ${topDay}`,
            detail: 'Incidents keep falling on the same day of the week.',
            incidentIds: dayIncidents.map((i) => i.id),
        });
    }

    // 3. Escalation: the later half is on average more than half a level more severe.
    if (total >= 3) {
        const sorted = [...incidents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        const half = Math.ceil(sorted.length / 2);
        const avg = (list: Incident[]) => list.reduce((s, i) => s + severityRank[i.content.severity], 0) / list.length;
        const earlier = sorted.slice(0, half);
        const later = sorted.slice(half);
        if (later.length && avg(later) > avg(earlier) + 0.5) {
            patterns.push({
                kind: 'escalation',
                tone: 'attention',
                title: 'Incidents are becoming more serious',
                detail: `Your more recent incidents are rated more severe than earlier ones, across ${total} incidents.`,
                incidentIds: later.map((i) => i.id),
            });
        }
    }

    // 4. Incidents within 30 days after a formal report.
    const reportDates = incidents
        .filter((i) => i.content.reported === 'yes' && i.content.reportedOn)
        .map((i) => Date.parse(i.content.reportedOn!));
    if (reportDates.length) {
        const after = incidents.filter((i) => {
            const t = Date.parse(i.occurredAt);
            return reportDates.some((r) => t > r && t - r < RETALIATION_WINDOW_DAYS * DAY);
        });
        if (after.length) {
            patterns.push({
                kind: 'retaliation-window',
                tone: 'attention',
                title: `${after.length} incident${after.length === 1 ? '' : 's'} within 30 days of a report`,
                detail: 'Treatment that changes after someone reports a concern can be relevant. An employment lawyer can advise on your situation.',
                incidentIds: after.map((i) => i.id),
            });
        }
    }

    // 5. Several distinct types. (The prototype compared whole type lists; this counts individual types.)
    const types = new Set(incidents.flatMap((i) => i.content.types));
    if (types.size >= 3) {
        patterns.push({
            kind: 'multi-type',
            tone: 'info',
            title: `${types.size} different types of incident`,
            detail: 'Your record covers several kinds of treatment, which may involve more than one area of law.',
            incidentIds: incidents.map((i) => i.id),
        });
    }

    // 6. Witnesses named on several incidents.
    const withWitnesses = incidents.filter((i) => i.content.witnesses.length > 0);
    if (withWitnesses.length >= 2) {
        patterns.push({
            kind: 'witnesses',
            tone: 'positive',
            title: `${withWitnesses.length} incidents have named witnesses`,
            detail: 'Witnesses can help confirm what happened.',
            incidentIds: withWitnesses.map((i) => i.id),
        });
    }

    return patterns;
}
