import { repositories, ResolvrDatabase, Vault } from '@/lib/db';
import type { Incident, IncidentContentInput } from '@/lib/model/schema';

/** Cheap KDF settings so tests run fast. Production uses Argon2id (19 MiB) or PBKDF2 600k. */
export const FAST_KDF = { prefer: 'pbkdf2-sha256' as const, iterations: 1_000 };

export function freshDb(): ResolvrDatabase {
    return new ResolvrDatabase(`test-${crypto.randomUUID()}`);
}

export async function freshVault(pin = '2468') {
    const db = freshDb();
    const vault = await Vault.create(pin, { db, kdf: FAST_KDF });
    return { db, vault, repos: repositories(vault) };
}

export function content(overrides: Partial<IncidentContentInput> = {}): IncidentContentInput {
    return {
        title: 'Comment in stand-up',
        types: ['Verbal Harassment'],
        severity: 'medium',
        occurredAt: '2026-03-02T09:42:00.000Z',
        description: 'Said "you people never get it right" in front of the team.',
        ...overrides,
    };
}

/** Build an Incident in memory for pure-function tests. */
export function incident(overrides: Partial<IncidentContentInput> = {}, extra: Partial<Incident> = {}): Incident {
    const c = content(overrides);
    return {
        id: crypto.randomUUID(),
        incId: 'INC-001',
        version: 1,
        createdAt: c.occurredAt,
        updatedAt: c.occurredAt,
        occurredAt: c.occurredAt,
        hash: 'a'.repeat(64),
        prevHash: '0'.repeat(64),
        annotations: [],
        source: 'app',
        content: {
            location: '',
            responsibleIds: [],
            witnesses: [],
            othersAffected: '',
            context: '',
            response: '',
            corroborationNames: '',
            reportedTo: '',
            reportedResponse: '',
            emotionalImpacts: [],
            physicalImpacts: [],
            professionalImpacts: [],
            impactStatement: '',
            evidenceCaptured: [],
            additionalNotes: '',
            attachmentIds: [],
            tags: [],
            jurisdiction: 'us',
            ...c,
        } as Incident['content'],
        ...extra,
    };
}
