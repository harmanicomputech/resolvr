import type { Incident } from '../model/schema';

/**
 * Case readiness: Documenting → Pattern found → Report ready → Legal ready.
 * Same thresholds as the prototype. Each stage describes the record, not the
 * strength of any claim.
 */

export const readinessStages = ['Documenting', 'Pattern found', 'Report ready', 'Legal ready'] as const;
export type ReadinessStage = (typeof readinessStages)[number];

export interface Readiness {
    stages: { name: ReadinessStage; done: boolean }[];
    /** Index of the furthest completed stage, or -1. */
    current: number;
    nextStep: string;
}

export function caseReadiness(incidents: Incident[], score: number, fileCount: number): Readiness {
    const total = incidents.length;
    const serious = incidents.filter((i) => i.content.severity === 'high' || i.content.severity === 'critical').length;
    const witnesses = new Set(incidents.flatMap((i) => i.content.witnesses.map((w) => w.personId))).size;
    const reported = incidents.some((i) => i.content.reported === 'yes');

    const done = [
        total > 0,
        serious >= 2 || total >= 3,
        score >= 50 && (witnesses > 0 || fileCount > 0),
        score >= 75 && reported,
    ];
    const current = done.lastIndexOf(true);

    const remaining = Math.max(0, 3 - total);
    const steps = [
        'Log your first incident. It takes about a minute.',
        `Log ${remaining} more incident${remaining === 1 ? '' : 's'} as they happen to show the pattern.`,
        [
            !witnesses && 'add any witnesses',
            !fileCount && 'attach supporting evidence',
            'build your evidence score past 50',
        ]
            .filter(Boolean)
            .join(', ')
            .replace(/^./, (c) => c.toUpperCase()) + '.',
        'Consider reporting formally and keep strengthening your record.',
        'Your record is well organised. If you are considering formal action, an employment lawyer can advise you.',
    ];

    return {
        stages: readinessStages.map((name, i) => ({ name, done: done[i]! })),
        current,
        nextStep: steps[Math.min(current + 1, 4)]!,
    };
}
