import { normalizeName } from '../model/people';
import type { Incident, Person } from '../model/schema';
import type { IncidentRepository } from './incidents';
import type { PeopleRepository } from './people';

/**
 * Merge two records of the same person. Incidents that named the duplicate
 * are re-pointed to the kept person; each of those changes is recorded as a
 * new version in the incident's history, so the merge itself is visible.
 */
export async function mergePeople(
    repos: { incidents: IncidentRepository; people: PeopleRepository },
    keepId: string,
    removeId: string,
): Promise<{ person: Person; incidentsUpdated: number }> {
    if (keepId === removeId) throw new Error('Choose two different people');
    const incidents = await repos.incidents.list({ includeDeleted: true });
    let updated = 0;
    for (const incident of incidents) {
        const c = incident.content;
        const named = c.responsibleIds.includes(removeId) || c.witnesses.some((w) => w.personId === removeId);
        if (!named) continue;
        const responsibleIds = [...new Set(c.responsibleIds.map((id) => (id === removeId ? keepId : id)))];
        const witnesses = c.witnesses
            .map((w) => (w.personId === removeId ? { ...w, personId: keepId } : w))
            .filter((w, i, all) => all.findIndex((x) => x.personId === w.personId) === i);
        await repos.incidents.update(incident.id, { ...c, responsibleIds, witnesses });
        updated++;
    }
    const person = await repos.people.merge(keepId, removeId);
    return { person, incidentsUpdated: updated };
}

function editDistance(a: string, b: string): number {
    const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0]!;
        dp[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const temp = dp[j]!;
            dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = temp;
        }
    }
    return dp[b.length]!;
}

/** "J. Smith" and "John Smith", or "Jon Smith" and "John Smith": probably the same person. */
export function likelySame(a: string, b: string): boolean {
    const x = normalizeName(a).split(' ');
    const y = normalizeName(b).split(' ');
    if (x.join(' ') === y.join(' ')) return true;
    const lastX = x.at(-1)!;
    const lastY = y.at(-1)!;
    if (x.length > 1 && y.length > 1 && lastX === lastY) {
        const fx = x[0]!;
        const fy = y[0]!;
        if (fx[0] === fy[0] && (fx.length === 1 || fy.length === 1 || editDistance(fx, fy) <= 1)) return true;
    }
    const whole = [x.join(' '), y.join(' ')];
    return whole[0]!.length >= 6 && editDistance(whole[0]!, whole[1]!) <= 1;
}

export function duplicateSuggestions(people: Person[]): [Person, Person][] {
    const pairs: [Person, Person][] = [];
    for (let i = 0; i < people.length; i++)
        for (let j = i + 1; j < people.length; j++)
            if (likelySame(people[i]!.name, people[j]!.name)) pairs.push([people[i]!, people[j]!]);
    return pairs;
}

/** How a person appears across the record. */
export function involvement(personId: string, incidents: Incident[]) {
    const responsible = incidents.filter((i) => i.content.responsibleIds.includes(personId));
    const witnessed = incidents.filter((i) => i.content.witnesses.some((w) => w.personId === personId));
    const all = [...new Map([...responsible, ...witnessed].map((i) => [i.id, i])).values()].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
    );
    return { responsible, witnessed, all, last: all[0]?.occurredAt };
}
