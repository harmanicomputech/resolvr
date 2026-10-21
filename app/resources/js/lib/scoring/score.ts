import type { Incident } from '../model/schema';

/**
 * Evidence strength score, ported from the prototype with the same weights
 * and caps (25 + 20 + 15 + 10 + 5 + 5 + 20 = 100). It measures how complete
 * and well-supported the record is. It is not a prediction of any outcome.
 */

export interface ScoreParts {
    incidents: number;
    witnesses: number;
    descriptions: number;
    files: number;
    variety: number;
    notes: number;
    severity: number;
    total: number;
}

export const SCORE_CAPS = {
    incidents: 25,
    witnesses: 20,
    descriptions: 15,
    files: 10,
    variety: 5,
    notes: 5,
    severity: 20,
} as const;

const SEVERITY_POINTS = { critical: 8, high: 6, medium: 3, low: 1 } as const;

export function scoreParts(incidents: Incident[], fileCount: number): ScoreParts {
    if (!incidents.length)
        return { incidents: 0, witnesses: 0, descriptions: 0, files: 0, variety: 0, notes: 0, severity: 0, total: 0 };

    const witnesses = new Set(incidents.flatMap((i) => i.content.witnesses.map((w) => w.personId))).size;
    const longDescriptions = incidents.filter((i) => i.content.description.length > 100).length;
    const types = new Set(incidents.flatMap((i) => i.content.types)).size;
    const severityPoints = incidents.reduce((sum, i) => sum + SEVERITY_POINTS[i.content.severity], 0);

    const parts = {
        incidents: Math.min(incidents.length * 5, SCORE_CAPS.incidents),
        witnesses: Math.min(witnesses * 5, SCORE_CAPS.witnesses),
        descriptions: Math.min(longDescriptions * 3, SCORE_CAPS.descriptions),
        files: Math.min(fileCount * 3, SCORE_CAPS.files),
        variety: types >= 2 ? SCORE_CAPS.variety : 0,
        notes: incidents.some((i) => i.annotations.length > 0) ? SCORE_CAPS.notes : 0,
        severity: Math.min(severityPoints, SCORE_CAPS.severity),
    };
    const total = Math.min(Math.round(Object.values(parts).reduce((a, b) => a + b, 0)), 100);
    return { ...parts, total };
}

/** Calm, non-judgemental label for the score band. */
export function scoreLabel(total: number): string {
    if (total >= 80) return 'Well documented';
    if (total >= 60) return 'Building well';
    if (total >= 40) return 'Taking shape';
    if (total >= 20) return 'Getting started';
    return 'Just beginning';
}

/** How to raise each part, for the score breakdown drawer (P2.4). */
export const scoreTips: Record<keyof typeof SCORE_CAPS, string> = {
    incidents: 'Log each incident separately, even small ones.',
    witnesses: 'Add the names of anyone who saw or heard what happened.',
    descriptions: 'Write a fuller description: what was said, by whom, and what happened next.',
    files: 'Attach screenshots, emails, photos or documents.',
    variety: 'Choose every type that applies to an incident.',
    notes: 'Add a dated note when something new happens or you remember more.',
    severity: 'Rate severity honestly; it helps show how serious things are.',
};
