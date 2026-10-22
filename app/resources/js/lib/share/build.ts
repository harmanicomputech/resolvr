import type { Repositories } from '../db';
import { lawPackFor } from '../laws/coverage';
import type { Incident } from '../model/schema';
import { packBundle, type SharedIncident } from './bundle';

const reportedLabel = { yes: 'Yes, formally', no: 'No', informal: 'Informally' } as const;

export interface ShareOptions {
    incidentIds: string[];
    includeFiles: boolean;
    includeName: boolean;
    note: string;
}

/** Build the plain (not yet encrypted) bundle for the chosen incidents. */
export async function buildShareBundle(repos: Repositories, options: ShareOptions) {
    const [all, people, files, profile, settings] = await Promise.all([
        repos.incidents.list(),
        repos.people.list(),
        repos.files.list(),
        repos.singletons.profile(),
        repos.singletons.settings(),
    ]);
    const chosen = new Set(options.incidentIds);
    const incidents = all.filter((i) => chosen.has(i.id));
    const name = new Map(people.map((p) => [p.id, p.name]));
    const linked = options.includeFiles ? files.filter((f) => f.incidentIds.some((id) => chosen.has(id))) : [];
    const fileParts = [];
    for (const f of linked) {
        const blob = await repos.files.open(f.id);
        if (!blob) continue;
        fileParts.push({
            meta: {
                id: f.id,
                name: f.name,
                mimeType: f.mimeType,
                size: blob.size,
                sha256: f.sha256,
                addedAt: f.addedAt,
            },
            bytes: new Uint8Array(await blob.arrayBuffer()),
        });
    }
    const included = new Set(fileParts.map((p) => p.meta.id));
    const plain = packBundle(
        {
            format: 'resolvr-share',
            version: 1,
            createdAt: new Date().toISOString(),
            author: options.includeName && profile.fullName ? profile.fullName : undefined,
            note: options.note.trim() || undefined,
            jurisdiction: lawPackFor(settings.jurisdiction).name,
            incidents: incidents.map((i) => sharedIncident(i, name, files, included)),
        },
        fileParts,
    );
    return { plain, incidentCount: incidents.length, fileCount: fileParts.length };
}

function sharedIncident(
    i: Incident,
    name: Map<string, string>,
    files: { id: string; incidentIds: string[] }[],
    included: Set<string>,
): SharedIncident {
    const c = i.content;
    const reported =
        c.reported === undefined
            ? undefined
            : [
                  reportedLabel[c.reported],
                  c.reportedTo && `to ${c.reportedTo}`,
                  c.reportedOn && `on ${c.reportedOn}`,
                  c.reportedResponse,
                  c.whyNotReported,
              ]
                  .filter(Boolean)
                  .join('; ');
    return {
        incId: i.incId,
        title: c.title,
        occurredAt: i.occurredAt,
        loggedAt: i.createdAt,
        updatedAt: i.updatedAt,
        severity: c.severity,
        types: c.typeOther ? [...c.types, c.typeOther] : c.types,
        location: c.location,
        responsible: c.responsibleIds.map((id) => name.get(id) ?? 'Unknown'),
        witnesses: c.witnesses.map((w) => name.get(w.personId) ?? 'Unknown'),
        othersAffected: c.othersAffected,
        description: c.description,
        context: c.context,
        frequency: c.frequency,
        response: c.response,
        reported,
        impacts: [...c.emotionalImpacts, ...c.physicalImpacts, ...c.professionalImpacts],
        impactStatement: c.impactStatement,
        evidenceCaptured: c.evidenceCaptured,
        additionalNotes: c.additionalNotes,
        annotations: i.annotations.map((a) => ({ at: a.at, text: a.text })),
        hash: i.hash,
        fileIds: files.filter((f) => f.incidentIds.includes(i.id) && included.has(f.id)).map((f) => f.id),
    };
}
