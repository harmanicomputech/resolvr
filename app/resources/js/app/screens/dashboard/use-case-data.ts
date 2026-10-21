import { legalCoverage, lawPacks } from '@/lib/laws/coverage';
import { detectPatterns } from '@/lib/patterns/detect';
import { caseReadiness } from '@/lib/scoring/readiness';
import { scoreParts } from '@/lib/scoring/score';
import { caseSummary, dailyHeat, monthlyCounts, severityCounts } from '@/lib/scoring/series';
import { caseStats } from '@/lib/scoring/stats';

import { useData } from '../../hooks/use-data';

/** Everything the dashboard shows, decrypted and computed in one pass. */
export function useCaseData() {
    return useData(async (repos) => {
        const [incidents, people, files, profile, settings] = await Promise.all([
            repos.incidents.list(),
            repos.people.list(),
            repos.files.list(),
            repos.singletons.profile(),
            repos.singletons.settings(),
        ]);
        const peopleById = new Map(people.map((p) => [p.id, p]));
        const now = new Date();
        const stats = caseStats(incidents, peopleById, now);
        const score = scoreParts(incidents, files.length);
        const pack = lawPacks[settings.jurisdiction] ?? lawPacks.us!;
        return {
            incidents,
            peopleById,
            fileCount: files.length,
            profile,
            stats,
            score,
            readiness: caseReadiness(incidents, score.total, files.length),
            patterns: detectPatterns(incidents, peopleById, {
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
            coverage: legalCoverage([...new Set(incidents.flatMap((i) => i.content.types))], pack),
            jurisdictionReady: Boolean(lawPacks[settings.jurisdiction]),
            months: monthlyCounts(incidents, 6, now),
            severity: severityCounts(incidents),
            heat: dailyHeat(incidents, 16, now),
            summary: caseSummary(stats, incidents),
        };
    });
}

export type CaseData = NonNullable<ReturnType<typeof useCaseData>['data']>;
