import usPack from './us.json';

/**
 * Jurisdiction packs map incident types to laws that commonly apply. Packs
 * are versioned data (P3.1 adds UK, Nigeria and Canada, and deadlines).
 * This is general information for organising a record, not legal advice.
 */

export interface Statute {
    id: string;
    short: string;
    name: string;
    triggers: string[];
}

export interface LawPack {
    id: string;
    version: string;
    name: string;
    reviewedBy: string | null;
    disclaimer: string;
    statutes: Statute[];
}

export const lawPacks: Record<string, LawPack> = { us: usPack as LawPack };

export interface Coverage {
    pack: LawPack;
    statutes: { statute: Statute; active: boolean }[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Which statutes in a pack are suggested by the incident types recorded.
 * Triggers match whole words, case-insensitively. (The prototype matched any
 * substring, so "Wage" wrongly triggered the age-discrimination law.)
 */
export function legalCoverage(types: string[], pack: LawPack = lawPacks.us!): Coverage {
    return {
        pack,
        statutes: pack.statutes.map((statute) => {
            const patterns = statute.triggers.map(
                (trigger) => new RegExp(`(^|[^\\p{L}])${escape(trigger)}($|[^\\p{L}])`, 'iu'),
            );
            return { statute, active: types.some((t) => patterns.some((p) => p.test(t))) };
        }),
    };
}
