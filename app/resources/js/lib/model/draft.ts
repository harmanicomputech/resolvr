import { z } from 'zod';

import { corroborationOptions, frequencies, reportedOptions, severities, whyNotReportedOptions } from './catalog';

/**
 * What the log flow edits: incident content in the shape a form needs
 * (people as names, the date as a local date-time). Drafts store this,
 * encrypted, on every change.
 */
export const logFormSchema = z.object({
    title: z.string().default(''),
    description: z.string().default(''),
    /** Local date-time as typed, "YYYY-MM-DDTHH:mm". */
    occurredLocal: z.string().default(''),
    location: z.string().default(''),
    types: z.array(z.string()).default([]),
    typeOther: z.string().default(''),
    severity: z.enum(severities).optional(),
    responsible: z.array(z.string()).default([]),
    witnesses: z
        .array(
            z.object({
                name: z.string(),
                statement: z.enum(['not-asked', 'requested', 'given', 'declined']).default('not-asked'),
            }),
        )
        .default([]),
    othersAffected: z.string().default(''),
    context: z.string().default(''),
    frequency: z.enum(frequencies).optional(),
    response: z.string().default(''),
    reported: z.enum(reportedOptions).optional(),
    reportedTo: z.string().default(''),
    reportedOn: z.string().default(''),
    reportedResponse: z.string().default(''),
    whyNotReported: z.enum(whyNotReportedOptions).optional(),
    corroboration: z.enum(corroborationOptions).optional(),
    corroborationNames: z.string().default(''),
    emotionalImpacts: z.array(z.string()).default([]),
    physicalImpacts: z.array(z.string()).default([]),
    professionalImpacts: z.array(z.string()).default([]),
    impactStatement: z.string().default(''),
    evidenceCaptured: z.array(z.string()).default([]),
    additionalNotes: z.string().default(''),
    fileIds: z.array(z.string()).default([]),
});
export type LogForm = z.infer<typeof logFormSchema>;

export const draftSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    /** Saved from Quick capture: only a title and maybe a photo or voice note. */
    quick: z.boolean().default(false),
    step: z.number().int().nonnegative().default(0),
    /** Set when the draft edits an existing incident. */
    incidentId: z.string().optional(),
    form: logFormSchema,
});
export type Draft = z.infer<typeof draftSchema>;

/** "YYYY-MM-DDTHH:mm" in local time, as <input type="datetime-local"> wants. */
export function toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyForm(now = new Date()): LogForm {
    return logFormSchema.parse({ occurredLocal: toLocalInput(now) });
}
