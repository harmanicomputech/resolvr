import { severities } from '../model/catalog';
import type { LogForm } from '../model/draft';
import { toLocalInput } from '../model/draft';
import type { Incident, IncidentContentInput, Person } from '../model/schema';
import type { FileRepository } from './files';
import type { IncidentRepository } from './incidents';
import type { PeopleRepository } from './people';

/** Turn the form into incident content, creating People for new names. */
export async function contentFromForm(
    form: LogForm,
    people: PeopleRepository,
    jurisdiction: IncidentContentInput['jurisdiction'] = 'us',
): Promise<IncidentContentInput> {
    const clean = (names: string[]) => [...new Set(names.map((n) => n.trim()).filter(Boolean))];
    const responsibleIds: string[] = [];
    for (const name of clean(form.responsible)) {
        const id = (await people.findOrCreate(name)).id;
        if (!responsibleIds.includes(id)) responsibleIds.push(id);
    }
    const witnesses: { personId: string; statement: LogForm['witnesses'][number]['statement'] }[] = [];
    for (const w of form.witnesses.filter((w) => w.name.trim())) {
        const personId = (await people.findOrCreate(w.name.trim())).id;
        if (!witnesses.some((x) => x.personId === personId)) witnesses.push({ personId, statement: w.statement });
    }
    const occurred = form.occurredLocal ? new Date(form.occurredLocal) : new Date();
    return {
        title: form.title.trim(),
        description: form.description.trim(),
        occurredAt: occurred.toISOString(),
        location: form.location,
        types: form.types.length ? form.types : ['Other'],
        typeOther: form.typeOther || undefined,
        severity: form.severity ?? severities[1],
        responsibleIds,
        witnesses,
        othersAffected: form.othersAffected,
        context: form.context,
        frequency: form.frequency,
        response: form.response,
        reported: form.reported,
        reportedTo: form.reported === 'no' ? '' : form.reportedTo,
        reportedOn: form.reported !== 'no' && form.reportedOn ? form.reportedOn : undefined,
        reportedResponse: form.reported === 'no' ? '' : form.reportedResponse,
        whyNotReported: form.reported === 'no' ? form.whyNotReported : undefined,
        corroboration: form.corroboration,
        corroborationNames: form.corroborationNames,
        emotionalImpacts: form.emotionalImpacts,
        physicalImpacts: form.physicalImpacts,
        professionalImpacts: form.professionalImpacts,
        impactStatement: form.impactStatement,
        evidenceCaptured: form.evidenceCaptured,
        additionalNotes: form.additionalNotes,
        attachmentIds: form.fileIds,
        jurisdiction,
    };
}

/** Link files to the incident they belong to (and unlink removed ones). */
export async function linkFiles(
    files: FileRepository,
    incidentId: string,
    fileIds: string[],
    previous: string[] = [],
): Promise<void> {
    for (const id of new Set([...fileIds, ...previous])) {
        const file = await files.get(id);
        if (!file) continue;
        const has = file.incidentIds.includes(incidentId);
        const wants = fileIds.includes(id);
        if (has !== wants)
            await files.update({
                ...file,
                incidentIds: wants
                    ? [...file.incidentIds, incidentId]
                    : file.incidentIds.filter((i) => i !== incidentId),
            });
    }
}

/** Save the form as a new incident, or a new version of an existing one. */
export async function commitForm(
    form: LogForm,
    repos: { incidents: IncidentRepository; people: PeopleRepository; files: FileRepository },
    options: { incidentId?: string; jurisdiction?: IncidentContentInput['jurisdiction'] } = {},
): Promise<Incident> {
    const content = await contentFromForm(form, repos.people, options.jurisdiction);
    if (options.incidentId) {
        const before = await repos.incidents.get(options.incidentId);
        const incident = await repos.incidents.update(options.incidentId, content);
        await linkFiles(repos.files, incident.id, form.fileIds, before?.content.attachmentIds ?? []);
        return incident;
    }
    const incident = await repos.incidents.create(content);
    await linkFiles(repos.files, incident.id, form.fileIds);
    return incident;
}

/** The form for editing an existing incident. */
export function formFromIncident(incident: Incident, peopleById: Map<string, Person>): LogForm {
    const c = incident.content;
    const name = (id: string) => peopleById.get(id)?.name ?? '';
    return {
        title: c.title,
        description: c.description,
        occurredLocal: toLocalInput(new Date(c.occurredAt)),
        location: c.location,
        types: c.types,
        typeOther: c.typeOther ?? '',
        severity: c.severity,
        responsible: c.responsibleIds.map(name).filter(Boolean),
        witnesses: c.witnesses.map((w) => ({ name: name(w.personId), statement: w.statement })).filter((w) => w.name),
        othersAffected: c.othersAffected,
        context: c.context,
        frequency: c.frequency,
        response: c.response,
        reported: c.reported,
        reportedTo: c.reportedTo,
        reportedOn: c.reportedOn ?? '',
        reportedResponse: c.reportedResponse,
        whyNotReported: c.whyNotReported,
        corroboration: c.corroboration,
        corroborationNames: c.corroborationNames,
        emotionalImpacts: c.emotionalImpacts,
        physicalImpacts: c.physicalImpacts,
        professionalImpacts: c.professionalImpacts,
        impactStatement: c.impactStatement,
        evidenceCaptured: c.evidenceCaptured,
        additionalNotes: c.additionalNotes,
        fileIds: c.attachmentIds,
    };
}
