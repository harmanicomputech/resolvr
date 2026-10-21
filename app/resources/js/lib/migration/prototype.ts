import { z } from 'zod';

import type { Repositories } from '../db';
import { corroborationOptions, frequencies, reportedOptions, whyNotReportedOptions } from '../model/catalog';
import { splitNames } from '../model/people';
import type { IncidentContentInput } from '../model/schema';

/**
 * Import a backup exported by the original Resolvr prototype (v2, localStorage
 * based). Incidents keep their INC numbers and dates; people are created from
 * the free-text name fields; vault files are decoded from data URLs and
 * stored encrypted. Each imported incident starts its tamper-evident history
 * at the moment of import, marked as an import, because the prototype's
 * records were not tamper-evident before.
 */

const looseString = z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => (v === null || v === undefined ? '' : String(v)));

const prototypeIncident = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    incId: looseString,
    timestamp: looseString,
    loggedAt: looseString,
    title: looseString,
    type: looseString,
    severity: looseString,
    location: looseString,
    person: looseString,
    description: looseString,
    context: looseString,
    frequency: looseString,
    witnesses: looseString,
    corroboration: looseString,
    corrNames: looseString,
    response: looseString,
    reported: looseString,
    reportedTo: looseString,
    reportedDate: looseString,
    reportedResponse: looseString,
    whyNotReported: looseString,
    emotionalImpact: looseString,
    physicalImpact: looseString,
    professionalImpact: looseString,
    impactStatement: looseString,
    evidenceCaptured: looseString,
    additionalNotes: looseString,
    notes: z
        .array(z.object({ ts: looseString, text: looseString }))
        .optional()
        .default([]),
});

const prototypeFile = z.object({
    name: looseString,
    type: looseString,
    data: z.string(),
    date: looseString,
});

export const prototypeExportSchema = z.object({
    app: z.literal('Resolvr').optional(),
    version: looseString,
    incidents: z.array(prototypeIncident).default([]),
    vault: z.array(prototypeFile).default([]),
});
export type PrototypeExport = z.infer<typeof prototypeExportSchema>;

export interface ImportReport {
    incidents: number;
    files: number;
    people: number;
    skipped: { item: string; reason: string }[];
}

const oneOf = <T extends readonly string[]>(options: T, value: string): T[number] | undefined =>
    (options as readonly string[]).includes(value) ? (value as T[number]) : undefined;

const chips = (value: string) =>
    value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const iso = (value: string, fallback: string): string => {
    const t = Date.parse(value);
    return Number.isNaN(t) ? fallback : new Date(t).toISOString();
};

const isoDay = (value: string): string | undefined => {
    const t = Date.parse(value);
    return Number.isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
};

/** "2 Aug 2026, 23:20 UTC": stored in the note text, so it reads the same on any device. */
const notedAt = (value: string): string => {
    const t = Date.parse(value);
    if (Number.isNaN(t)) return value;
    return `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(t)} UTC`;
};

export function parsePrototypeExport(json: unknown): PrototypeExport {
    return prototypeExportSchema.parse(json);
}

export async function importPrototype(json: unknown, repos: Repositories, now = new Date()): Promise<ImportReport> {
    const data = parsePrototypeExport(json);
    const report: ImportReport = { incidents: 0, files: 0, people: 0, skipped: [] };
    const peopleBefore = (await repos.people.list()).length;
    const nowIso = now.toISOString();

    // Oldest first, so imported incidents enter the ledger in date order.
    const ordered = [...data.incidents].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

    for (const old of ordered) {
        const label = old.incId || old.title || 'incident';
        try {
            const responsibleIds = await Promise.all(
                splitNames(old.person).map(async (n) => (await repos.people.findOrCreate(n)).id),
            );
            const witnessIds = await Promise.all(
                splitNames(old.witnesses).map(async (n) => (await repos.people.findOrCreate(n)).id),
            );
            const severity = oneOf(['low', 'medium', 'high', 'critical'] as const, old.severity) ?? 'medium';
            const types = old.type
                .split(';')
                .map((t) => t.trim())
                .filter(Boolean);

            const content: IncidentContentInput = {
                title: old.title || 'Untitled incident',
                types: types.length ? types : ['Other'],
                severity,
                occurredAt: iso(old.timestamp, nowIso),
                location: old.location,
                responsibleIds: [...new Set(responsibleIds)],
                witnesses: [...new Set(witnessIds)].map((personId) => ({ personId, statement: 'not-asked' as const })),
                description: old.description || old.title || 'No description was recorded.',
                context: old.context,
                frequency: oneOf(frequencies, old.frequency),
                response: old.response,
                corroboration: oneOf(corroborationOptions, old.corroboration),
                corroborationNames: old.corrNames,
                reported: oneOf(reportedOptions, old.reported),
                reportedTo: old.reportedTo,
                reportedOn: isoDay(old.reportedDate),
                reportedResponse: old.reportedResponse,
                whyNotReported: oneOf(whyNotReportedOptions, old.whyNotReported),
                emotionalImpacts: chips(old.emotionalImpact),
                physicalImpacts: chips(old.physicalImpact),
                professionalImpacts: chips(old.professionalImpact),
                impactStatement: old.impactStatement,
                evidenceCaptured: chips(old.evidenceCaptured),
                additionalNotes: old.additionalNotes,
            };

            const incId = /^INC-\d{3,}$/.test(old.incId) ? old.incId : undefined;
            const created = await repos.incidents.create(content, {
                source: 'import',
                incId,
                createdAt: iso(old.loggedAt || old.timestamp, nowIso),
                at: now,
            });
            for (const note of old.notes) {
                if (note.text.trim())
                    await repos.incidents.annotate(
                        created.id,
                        `${note.text}${note.ts ? ` (originally noted ${notedAt(note.ts)})` : ''}`,
                        now,
                    );
            }
            report.incidents++;
        } catch (error) {
            report.skipped.push({ item: label, reason: error instanceof Error ? error.message : 'Could not import' });
        }
    }

    for (const file of data.vault) {
        try {
            const blob = dataUrlToBlob(file.data, file.type);
            await repos.files.add(new File([blob], file.name || 'evidence', { type: blob.type }), {
                capturedAt: file.date ? iso(file.date, nowIso) : undefined,
            });
            report.files++;
        } catch {
            report.skipped.push({ item: file.name || 'file', reason: 'The file data could not be read' });
        }
    }

    report.people = (await repos.people.list()).length - peopleBefore;
    return report;
}

function dataUrlToBlob(dataUrl: string, fallbackType: string): Blob {
    const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
    if (!match) throw new Error('Not a data URL');
    const [, type, base64, payload] = match;
    const bytes = base64
        ? Uint8Array.from(atob(payload!), (c) => c.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(payload!));
    return new Blob([bytes], { type: type || fallbackType || 'application/octet-stream' });
}
