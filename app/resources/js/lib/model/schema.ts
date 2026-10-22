import { z } from 'zod';

import {
    corroborationOptions,
    frequencies,
    jurisdictions,
    reportedOptions,
    severities,
    whyNotReportedOptions,
} from './catalog';

/*
 * The data model. Everything here is encrypted on the device before it is
 * stored (see lib/db). Schemas validate data at the edges: forms, imports and
 * reading back from storage.
 */

const id = z.string().min(1);
const isoDateTime = z.iso.datetime({ offset: true });
const isoDate = z.iso.date();
const text = (max = 20_000) => z.string().trim().max(max);

/** A person mentioned anywhere in the record, normalised from free text (P2.9 builds on this). */
export const personSchema = z.object({
    id,
    name: text(200).min(1),
    /** Lower-cased, punctuation-free form used to match "J. Smith" with "j smith". */
    normalizedName: z.string(),
    aliases: z.array(z.string()).default([]),
    role: text(200).optional(),
    relationship: z.enum(['manager', 'colleague', 'hr', 'senior-leader', 'client', 'other']).optional(),
    createdAt: isoDateTime,
});
export type Person = z.infer<typeof personSchema>;

/** A witness to a specific incident. Statement status lives here because it is per incident. */
export const witnessSchema = z.object({
    personId: id,
    statement: z.enum(['not-asked', 'requested', 'given', 'declined']).default('not-asked'),
    note: text(2000).optional(),
});
export type Witness = z.infer<typeof witnessSchema>;

/** A timestamped note added to an incident after it was logged. Annotations are never edited. */
export const annotationSchema = z.object({
    id,
    at: isoDateTime,
    text: text(5000).min(1),
});
export type Annotation = z.infer<typeof annotationSchema>;

/** The parts of an incident the person writes. Everything else is managed by the app. */
export const incidentContentSchema = z.object({
    title: text(200).min(1, 'Add a short title'),
    types: z.array(z.string().min(1)).min(1, 'Choose at least one type'),
    typeOther: text(500).optional(),
    severity: z.enum(severities),
    occurredAt: isoDateTime,
    location: text(500).default(''),
    responsibleIds: z.array(id).default([]),
    witnesses: z.array(witnessSchema).default([]),
    othersAffected: text(2000).default(''),
    description: text().min(1, 'Describe what happened'),
    context: text().default(''),
    frequency: z.enum(frequencies).optional(),
    response: text().default(''),
    corroboration: z.enum(corroborationOptions).optional(),
    corroborationNames: text(2000).default(''),
    reported: z.enum(reportedOptions).optional(),
    reportedTo: text(500).default(''),
    reportedOn: isoDate.optional(),
    reportedResponse: text().default(''),
    whyNotReported: z.enum(whyNotReportedOptions).optional(),
    emotionalImpacts: z.array(z.string()).default([]),
    physicalImpacts: z.array(z.string()).default([]),
    professionalImpacts: z.array(z.string()).default([]),
    impactStatement: text().default(''),
    evidenceCaptured: z.array(z.string()).default([]),
    additionalNotes: text().default(''),
    attachmentIds: z.array(id).default([]),
    tags: z.array(text(60)).default([]),
    /** Other incidents this one relates to (P2.6). */
    relatedIds: z.array(id).default([]),
    jurisdiction: z.enum(jurisdictions).default('us'),
});
export type IncidentContent = z.infer<typeof incidentContentSchema>;
export type IncidentContentInput = z.input<typeof incidentContentSchema>;

/** The current state of an incident. Its history lives in the ledger. */
export const incidentSchema = z.object({
    id,
    /** Human ID, e.g. INC-014. Assigned once and never reused, even after deletion. */
    incId: z.string().regex(/^INC-\d{3,}$/),
    version: z.number().int().positive(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    /** Copied from content for sorting without opening the content. */
    occurredAt: isoDateTime,
    /** Hash of the latest ledger entry for this incident, and the hash before it. */
    hash: z.string().length(64),
    prevHash: z.string().length(64),
    content: incidentContentSchema,
    annotations: z.array(annotationSchema).default([]),
    /** Set when moved to trash; recoverable for 30 days (P2.6). */
    deletedAt: isoDateTime.optional(),
    source: z.enum(['app', 'import']).default('app'),
});
export type Incident = z.infer<typeof incidentSchema>;

export const ledgerOps = ['create', 'edit', 'annotate', 'trash', 'restore', 'import'] as const;
export type LedgerOp = (typeof ledgerOps)[number];

/** One append-only version of an incident, as hashed into the chain. */
export const incidentVersionSchema = z.object({
    op: z.enum(ledgerOps),
    at: isoDateTime,
    incidentId: id,
    incId: z.string(),
    version: z.number().int().positive(),
    /** Full snapshot of the incident at this version (without hash fields). */
    snapshot: z.object({
        content: incidentContentSchema,
        annotations: z.array(annotationSchema),
        createdAt: isoDateTime,
        deletedAt: isoDateTime.optional(),
        source: z.enum(['app', 'import']),
    }),
});
export type IncidentVersion = z.infer<typeof incidentVersionSchema>;

/** Metadata for a file in the evidence vault. The bytes live, encrypted, in the blob table. */
export const evidenceFileSchema = z.object({
    id,
    name: text(500).min(1),
    mimeType: z.string(),
    size: z.number().int().nonnegative(),
    /** SHA-256 of the original file, for proving it has not changed. */
    sha256: z.string().length(64),
    addedAt: isoDateTime,
    /** When the photo or document was originally made, if known (e.g. from EXIF). */
    capturedAt: isoDateTime.optional(),
    incidentIds: z.array(id).default([]),
    folder: text(120).optional(),
    ocrText: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    /** Tiny blurred preview (data URL) shown while the full image decrypts. */
    thumb: z.string().max(4000).optional(),
    deletedAt: isoDateTime.optional(),
});
export type EvidenceFile = z.infer<typeof evidenceFileSchema>;

/** About the person and their job, used to fill in letters and dossiers. */
export const caseProfileSchema = z.object({
    fullName: text(200).default(''),
    email: text(200).default(''),
    phone: text(60).default(''),
    jobTitle: text(200).default(''),
    department: text(200).default(''),
    employer: text(200).default(''),
    managerName: text(200).default(''),
    hrContact: text(200).default(''),
    employmentStart: isoDate.optional(),
    jurisdiction: z.enum(jurisdictions).default('us'),
    region: text(100).default(''),
});
export type CaseProfile = z.infer<typeof caseProfileSchema>;

export const autoLockOptions = [1, 2, 5, 10, 30, 0] as const;

export const settingsSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']).default('light'),
    /** Minutes of inactivity before locking; 0 means never. */
    autoLockMinutes: z
        .union([z.literal(1), z.literal(2), z.literal(5), z.literal(10), z.literal(30), z.literal(0)])
        .default(2),
    lockOnHide: z.boolean().default(true),
    stealth: z.boolean().default(false),
    panicGesture: z.boolean().default(true),
    reducedMotion: z.enum(['system', 'reduce', 'full']).default('system'),
    textScale: z.number().min(0.85).max(1.4).default(1),
    jurisdiction: z.enum(jurisdictions).default('us'),
    notLegalAdviceAcknowledgedAt: isoDateTime.optional(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const documentTypes = [
    'hr-complaint',
    'witness-request',
    'follow-up-email',
    'agency-intake',
    'lawyer-briefing',
] as const;
export type DocumentType = (typeof documentTypes)[number];

/** A drafted document (P2.10), edited in the studio and stored encrypted like everything else. */
export const draftDocumentSchema = z.object({
    id,
    type: z.enum(documentTypes),
    title: text(200),
    /** Editor content as simple HTML (paragraphs, headings, lists, bold, italic). */
    html: z.string().max(400_000),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    tone: z.enum(['formal', 'firm', 'urgent']).default('formal'),
    outcome: z.enum(['investigation', 'mediation', 'discipline', 'transfer', 'cessation']).optional(),
    incidentIds: z.array(id).default([]),
    fields: z.array(z.string()).default([]),
    context: text(2000).default(''),
});
export type DraftDocument = z.infer<typeof draftDocumentSchema>;
