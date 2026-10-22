import type { Incident } from '../model/schema';
import { statuteApplies, type LawPack, type Statute } from './coverage';

/**
 * Time limits, worked out from the record. Deliberately cautious: each limit
 * is counted from the *first* incident that suggests the law, which gives the
 * earliest possible date. (Many limits can run from the most recent of a
 * series instead; that later date is shown too.) General information only.
 */

export interface Deadline {
    statute: Statute;
    /** First relevant incident + period: the earliest the limit could fall. */
    earliest: Date;
    /** Most recent relevant incident + period. */
    latest: Date;
    firstIncidentAt: string;
    incidentCount: number;
}

export interface DeadlineSummary {
    deadlines: Deadline[];
    /** The soonest date still ahead, counted cautiously; null if every limit may have passed. */
    next: { deadline: Deadline; date: Date; basis: 'first' | 'latest'; daysLeft: number } | null;
    /** True when some time limits may already have passed. */
    somePassed: boolean;
}

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function filingDeadlines(incidents: Incident[], pack: LawPack, today = new Date()): DeadlineSummary {
    const live = incidents.filter((i) => !i.deletedAt);
    const deadlines: Deadline[] = [];
    for (const statute of pack.statutes) {
        const limit = statute.limitation;
        if (!limit || limit.from !== 'incident') continue;
        const relevant = live
            .filter((i) => statuteApplies(statute, i.content.types))
            .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        if (!relevant.length) continue;
        const first = relevant[0]!.occurredAt;
        const last = relevant[relevant.length - 1]!.occurredAt;
        deadlines.push({
            statute,
            earliest: new Date(startOfDay(new Date(first)).getTime() + limit.days * DAY),
            latest: new Date(startOfDay(new Date(last)).getTime() + limit.days * DAY),
            firstIncidentAt: first,
            incidentCount: relevant.length,
        });
    }
    deadlines.sort((a, b) => a.earliest.getTime() - b.earliest.getTime());

    const now = startOfDay(today).getTime();
    const daysLeft = (d: Date) => Math.round((d.getTime() - now) / DAY);
    const firstAhead = deadlines.find((d) => d.earliest.getTime() >= now);
    const latestAhead = [...deadlines]
        .filter((d) => d.latest.getTime() >= now)
        .sort((a, b) => a.latest.getTime() - b.latest.getTime())[0];
    const somePassed = deadlines.some((d) => d.earliest.getTime() < now);

    // Prefer the cautious date unless a limit that started earlier has already passed on it.
    let next: DeadlineSummary['next'] = null;
    if (firstAhead && !somePassed)
        next = {
            deadline: firstAhead,
            date: firstAhead.earliest,
            basis: 'first',
            daysLeft: daysLeft(firstAhead.earliest),
        };
    else if (latestAhead)
        next = {
            deadline: latestAhead,
            date: latestAhead.latest,
            basis: 'latest',
            daysLeft: daysLeft(latestAhead.latest),
        };
    else if (firstAhead)
        next = {
            deadline: firstAhead,
            date: firstAhead.earliest,
            basis: 'first',
            daysLeft: daysLeft(firstAhead.earliest),
        };
    return { deadlines, next, somePassed };
}
