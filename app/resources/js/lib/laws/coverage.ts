import type { Jurisdiction } from '../model/catalog';
import caPack from './ca.json';
import ngPack from './ng.json';
import ukPack from './uk.json';
import usPack from './us.json';

/**
 * Jurisdiction packs: versioned JSON (`version`) mapping incident types to
 * laws that commonly apply, with plain-language summaries, where to file,
 * and typical time limits. General information for organising a record, not
 * legal advice. `reviewedBy` stays null until a qualified lawyer has
 * reviewed the pack, and the app says so.
 */

export interface Limitation {
    /** Typical period in days. */
    days: number;
    /** What starts the clock. Only "incident" can be computed from the record. */
    from: 'incident' | 'employment-end';
    /** The step the time limit applies to, e.g. "File a charge with the EEOC". */
    label: string;
    note: string;
}

export interface Statute {
    id: string;
    short: string;
    name: string;
    summary: string;
    triggers: string[];
    agency?: { name: string; url: string };
    limitation?: Limitation;
}

export interface SupportResource {
    name: string;
    description: string;
    url?: string;
    contact?: string;
}

export interface LawPack {
    id: Jurisdiction;
    version: string;
    name: string;
    reviewedBy: string | null;
    disclaimer: string;
    lawyerHelp: { label: string; url: string };
    statutes: Statute[];
    support: SupportResource[];
}

export const lawPacks: Record<Jurisdiction, LawPack> = {
    us: usPack as LawPack,
    uk: ukPack as LawPack,
    ng: ngPack as LawPack,
    ca: caPack as LawPack,
};

export function lawPackFor(jurisdiction: Jurisdiction | undefined): LawPack {
    return lawPacks[jurisdiction ?? 'us'] ?? lawPacks.us;
}

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
export function legalCoverage(types: string[], pack: LawPack = lawPacks.us): Coverage {
    return {
        pack,
        statutes: pack.statutes.map((statute) => ({ statute, active: statuteApplies(statute, types) })),
    };
}

/** Does any of these incident types suggest the statute? */
export function statuteApplies(statute: Statute, types: string[]): boolean {
    const patterns = statute.triggers.map(
        (trigger) => new RegExp(`(^|[^\\p{L}])${escape(trigger)}($|[^\\p{L}])`, 'iu'),
    );
    return types.some((t) => patterns.some((p) => p.test(t)));
}
