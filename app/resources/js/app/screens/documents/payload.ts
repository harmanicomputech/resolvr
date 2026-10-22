import type { CaseProfile, DocumentType, EvidenceFile, Incident, Person } from '@/lib/model/schema';

import type { DraftPayload } from '../../lib/ai';

export const documentTypeInfo: Record<DocumentType, { title: string; blurb: string }> = {
    'hr-complaint': { title: 'HR complaint', blurb: 'A formal written complaint to HR, built from your incidents.' },
    'witness-request': {
        title: 'Witness statement request',
        blurb: 'A short, low-pressure note asking a colleague to write down what they saw.',
    },
    'follow-up-email': { title: 'Follow-up after a meeting', blurb: 'Record what was said and agreed, in writing.' },
    'agency-intake': {
        title: 'Agency intake summary',
        blurb: 'A factual summary for an EEOC, ACAS or similar intake form.',
    },
    'lawyer-briefing': { title: 'Lawyer briefing', blurb: 'A concise chronology to take to a first consultation.' },
};

/** The parts of each incident the person can choose to send. */
export const fieldOptions = [
    { id: 'description', label: 'What happened' },
    { id: 'people', label: 'Names of people involved' },
    { id: 'location', label: 'Where' },
    { id: 'reported', label: 'Reporting' },
    { id: 'impact', label: 'Impact on you' },
    { id: 'notes', label: 'Later notes' },
    { id: 'evidence', label: 'What evidence exists (not the files)' },
] as const;
export type FieldId = (typeof fieldOptions)[number]['id'];
export const defaultFields: FieldId[] = ['description', 'people', 'location', 'reported', 'evidence'];

const dateText = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** Build exactly what will be sent. This same object is shown in "What will be sent". */
export function buildPayload(opts: {
    type: DocumentType;
    tone: string;
    outcome?: string;
    jurisdiction: string;
    context: string;
    profile: CaseProfile;
    incidents: Incident[];
    fields: FieldId[];
    people: Map<string, Person>;
    files: Map<string, EvidenceFile>;
}): DraftPayload {
    const has = (f: FieldId) => opts.fields.includes(f);
    const names = (ids: string[]) =>
        ids
            .map((id) => opts.people.get(id)?.name ?? '')
            .filter(Boolean)
            .join(', ');
    const p = opts.profile;
    const details = Object.fromEntries(
        Object.entries({
            fullName: p.fullName,
            jobTitle: p.jobTitle,
            department: p.department,
            employer: p.employer,
            manager: has('people') ? p.managerName : '',
            recipient: p.hrContact,
            date: dateText(new Date().toISOString()),
        }).filter(([, v]) => v && v.trim()),
    );
    const incidents = [...opts.incidents]
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
        .map((i) => {
            const c = i.content;
            const files = c.attachmentIds.map((id) => opts.files.get(id)).filter(Boolean) as EvidenceFile[];
            const reported =
                c.reported === 'yes'
                    ? `Reported formally to ${c.reportedTo || 'unspecified'}${c.reportedOn ? ` on ${dateText(c.reportedOn)}` : ''}.${c.reportedResponse ? ` Their response: ${c.reportedResponse}` : ''}`
                    : c.reported === 'informal'
                      ? `Mentioned informally to ${c.reportedTo || 'unspecified'}.${c.reportedResponse ? ` Their response: ${c.reportedResponse}` : ''}`
                      : c.reported === 'no'
                        ? `Not reported${c.whyNotReported ? ` (${c.whyNotReported.toLowerCase()})` : ''}.`
                        : '';
            const evidence = [
                c.evidenceCaptured.join(', '),
                files.length
                    ? `${files.length} file${files.length === 1 ? '' : 's'} kept (${[...new Set(files.map((f) => (f.mimeType.startsWith('image/') ? 'images' : f.mimeType === 'application/pdf' ? 'PDFs' : 'audio')))].join(', ')})`
                    : '',
            ]
                .filter(Boolean)
                .join('; ');
            const row: Record<string, string> = {
                id: i.incId,
                date: dateText(i.occurredAt),
                title: c.title,
                types: c.types.join('; '),
                severity: c.severity,
                ...(has('location') && c.location ? { location: c.location } : {}),
                ...(has('description')
                    ? {
                          description: [
                              c.description,
                              c.context && `Before: ${c.context}`,
                              c.response && `My response: ${c.response}`,
                          ]
                              .filter(Boolean)
                              .join('\n'),
                      }
                    : {}),
                ...(has('people') && c.responsibleIds.length ? { responsible: names(c.responsibleIds) } : {}),
                ...(has('people') && c.witnesses.length
                    ? { witnesses: names(c.witnesses.map((w) => w.personId)) }
                    : {}),
                ...(has('reported') && reported ? { reported } : {}),
                ...(has('impact')
                    ? {
                          impact: [
                              [...c.emotionalImpacts, ...c.physicalImpacts, ...c.professionalImpacts].join(', '),
                              c.impactStatement,
                          ]
                              .filter(Boolean)
                              .join('. '),
                      }
                    : {}),
                ...(has('notes') && i.annotations.length
                    ? { notes: i.annotations.map((a) => `${dateText(a.at)}: ${a.text}`).join('\n') }
                    : {}),
                ...(has('evidence') && evidence ? { evidence } : {}),
            };
            return Object.fromEntries(Object.entries(row).filter(([, v]) => v));
        });
    return {
        mode: 'document',
        type: opts.type,
        tone: opts.tone,
        outcome: opts.outcome,
        jurisdiction: opts.jurisdiction,
        context: opts.context.trim() || undefined,
        details,
        incidents,
    };
}
