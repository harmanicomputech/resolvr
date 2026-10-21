import { severityRank, type Severity } from '../model/catalog';
import type { Incident, Person } from '../model/schema';

export interface IncidentFilter {
    query: string;
    severities: Severity[];
    types: string[];
    personIds: string[];
    /** Inclusive local dates, "YYYY-MM-DD". */
    from?: string;
    to?: string;
    reported?: 'yes' | 'informal' | 'no' | 'unknown';
}

export type IncidentSort = 'newest' | 'oldest' | 'severity';

export const emptyFilter: IncidentFilter = { query: '', severities: [], types: [], personIds: [] };

export function activeFilterCount(f: IncidentFilter): number {
    return (
        f.severities.length +
        f.types.length +
        f.personIds.length +
        (f.from ? 1 : 0) +
        (f.to ? 1 : 0) +
        (f.reported ? 1 : 0)
    );
}

const localDay = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Filter and sort decrypted incidents. Search covers text fields, the INC id and people's names. */
export function filterIncidents(
    incidents: Incident[],
    filter: IncidentFilter,
    sort: IncidentSort,
    peopleById: Map<string, Person>,
): Incident[] {
    const q = filter.query.trim().toLowerCase();
    const result = incidents.filter((i) => {
        const c = i.content;
        if (filter.severities.length && !filter.severities.includes(c.severity)) return false;
        if (filter.types.length && !filter.types.some((t) => c.types.includes(t))) return false;
        const people = [...c.responsibleIds, ...c.witnesses.map((w) => w.personId)];
        if (filter.personIds.length && !filter.personIds.some((p) => people.includes(p))) return false;
        const day = localDay(i.occurredAt);
        if (filter.from && day < filter.from) return false;
        if (filter.to && day > filter.to) return false;
        if (filter.reported && (c.reported ?? 'unknown') !== filter.reported) return false;
        if (q) {
            const names = people.map((id) => peopleById.get(id)?.name ?? '').join(' ');
            const haystack = [
                i.incId,
                c.title,
                c.description,
                c.location,
                c.context,
                c.response,
                c.additionalNotes,
                c.types.join(' '),
                names,
                i.annotations.map((a) => a.text).join(' '),
            ]
                .join(' ')
                .toLowerCase();
            if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
        }
        return true;
    });
    return result.sort((a, b) => {
        if (sort === 'oldest') return a.occurredAt.localeCompare(b.occurredAt);
        if (sort === 'severity')
            return (
                severityRank[b.content.severity] - severityRank[a.content.severity] ||
                b.occurredAt.localeCompare(a.occurredAt)
            );
        return b.occurredAt.localeCompare(a.occurredAt);
    });
}
