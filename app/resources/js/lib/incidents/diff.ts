import type { Annotation, IncidentContent, Person } from '../model/schema';

export interface FieldChange {
    field: string;
    label: string;
    before: string;
    after: string;
}

const labels: Partial<Record<keyof IncidentContent, string>> = {
    title: 'Title',
    description: 'What happened',
    occurredAt: 'When',
    location: 'Where',
    types: 'Type',
    typeOther: 'Other type',
    severity: 'Severity',
    responsibleIds: 'Responsible',
    witnesses: 'Witnesses',
    othersAffected: 'Others affected',
    context: 'What led up to it',
    frequency: 'How often',
    response: 'Your response',
    corroboration: 'Others with similar experiences',
    corroborationNames: 'Their names',
    reported: 'Reported',
    reportedTo: 'Reported to',
    reportedOn: 'Reported on',
    reportedResponse: 'Their response',
    whyNotReported: 'Why not reported',
    emotionalImpacts: 'Emotional impact',
    physicalImpacts: 'Physical impact',
    professionalImpacts: 'Professional impact',
    impactStatement: 'Impact statement',
    evidenceCaptured: 'Evidence kept',
    additionalNotes: 'Additional notes',
    attachmentIds: 'Attached files',
    tags: 'Tags',
    relatedIds: 'Linked incidents',
    jurisdiction: 'Jurisdiction',
};

/** Human-readable field changes between two versions of an incident's content. */
export function diffContent(
    before: Partial<IncidentContent>,
    after: Partial<IncidentContent>,
    names: { people: Map<string, Person>; files?: Map<string, string>; incidents?: Map<string, string> },
): FieldChange[] {
    const show = (key: string, value: unknown): string => {
        if (value === undefined || value === null || value === '') return '–';
        if (key === 'occurredAt')
            return new Date(String(value)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
        if (key === 'responsibleIds')
            return (value as string[]).map((id) => names.people.get(id)?.name ?? 'Someone').join(', ') || '–';
        if (key === 'witnesses')
            return (
                (value as { personId: string; statement: string }[])
                    .map((w) => `${names.people.get(w.personId)?.name ?? 'Someone'} (${w.statement.replace('-', ' ')})`)
                    .join(', ') || '–'
            );
        if (key === 'attachmentIds')
            return (value as string[]).map((id) => names.files?.get(id) ?? 'a file').join(', ') || '–';
        if (key === 'relatedIds')
            return (value as string[]).map((id) => names.incidents?.get(id) ?? 'an incident').join(', ') || '–';
        if (Array.isArray(value)) return value.join(', ') || '–';
        return String(value);
    };
    const keys = (Object.keys(labels) as (keyof IncidentContent)[]).filter(
        (k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null),
    );
    return keys
        .map((k) => ({ field: k, label: labels[k]!, before: show(k, before[k]), after: show(k, after[k]) }))
        .filter((c) => c.before !== c.after);
}

/** Notes added between two versions. */
export function addedNotes(before: Annotation[], after: Annotation[]): Annotation[] {
    const seen = new Set(before.map((a) => a.id));
    return after.filter((a) => !seen.has(a.id));
}
