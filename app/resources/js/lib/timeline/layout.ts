import { incidentTypeGroups, severityRank } from '../model/catalog';
import type { Incident, Person } from '../model/schema';
import { RETALIATION_WINDOW_DAYS } from '../patterns/detect';

/*
 * Pure layout helpers for the timeline: categories, lanes per person,
 * report markers with their 30-day windows, and a severity trend.
 */

export type Category = 'harassment' | 'discrimination' | 'retaliation' | 'other';
export const categoryLabels: Record<Category, string> = {
    harassment: 'Harassment',
    discrimination: 'Discrimination',
    retaliation: 'Retaliation',
    other: 'Other kinds',
};

const groupOf = new Map(incidentTypeGroups.flatMap((g) => g.types.map((t) => [t.value, g.id])));

/** The one category used for colour. Retaliation wins when present, as it matters most for timing. */
export function categoryOf(types: string[]): Category {
    const groups = new Set(types.map((t) => groupOf.get(t)));
    if (groups.has('retaliation')) return 'retaliation';
    if (groups.has('discrimination')) return 'discrimination';
    if (groups.has('harassment')) return 'harassment';
    return 'other';
}

export interface Lane {
    id: string;
    label: string;
    incidentIds: string[];
}

/** One lane per person responsible (most involved first), then "Others" and "No one named". */
export function lanesFor(incidents: Incident[], peopleById: Map<string, Person>, max = 5): Lane[] {
    const byPerson = new Map<string, string[]>();
    const nobody: string[] = [];
    for (const i of incidents) {
        const first = i.content.responsibleIds[0];
        if (!first) nobody.push(i.id);
        else byPerson.set(first, [...(byPerson.get(first) ?? []), i.id]);
    }
    const ranked = [...byPerson.entries()].sort((a, b) => b[1].length - a[1].length);
    const lanes: Lane[] = ranked
        .slice(0, max)
        .map(([id, ids]) => ({ id, label: peopleById.get(id)?.name ?? 'Someone', incidentIds: ids }));
    const rest = ranked.slice(max).flatMap(([, ids]) => ids);
    if (rest.length) lanes.push({ id: 'others', label: 'Others', incidentIds: rest });
    if (nobody.length) lanes.push({ id: 'none', label: 'No one named', incidentIds: nobody });
    return lanes;
}

export interface ReportMarker {
    incidentId: string;
    at: Date;
    to: string;
    windowEnd: Date;
}

/** When something was reported, and the 30-day window after it in which treatment is worth watching. */
export function reportMarkers(incidents: Incident[]): ReportMarker[] {
    return incidents
        .filter((i) => (i.content.reported === 'yes' || i.content.reported === 'informal') && i.content.reportedOn)
        .map((i) => {
            const at = new Date(`${i.content.reportedOn}T12:00:00`);
            return {
                incidentId: i.id,
                at,
                to: i.content.reportedTo,
                windowEnd: new Date(at.getTime() + RETALIATION_WINDOW_DAYS * 86_400_000),
            };
        })
        .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Rolling average severity (1–4) over the last `window` incidents, in date order. */
export function severityTrend(incidents: Incident[], window = 3): { at: Date; value: number }[] {
    const sorted = [...incidents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    return sorted.map((i, idx) => {
        const slice = sorted.slice(Math.max(0, idx - window + 1), idx + 1);
        return {
            at: new Date(i.occurredAt),
            value: slice.reduce((sum, x) => sum + severityRank[x.content.severity], 0) / slice.length,
        };
    });
}
