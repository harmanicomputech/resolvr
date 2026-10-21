import { describe, expect, it } from 'vitest';

import { content, freshVault } from '@/test/fixtures';

import { duplicateSuggestions, likelySame, mergePeople } from './people-merge';

describe('people', () => {
    it('spots likely duplicates without over-matching', () => {
        expect(likelySame('J. Smith', 'John Smith')).toBe(true);
        expect(likelySame('Jon Smith', 'John Smith')).toBe(true);
        expect(likelySame('Ann Lee', 'Anne Lee')).toBe(true);
        expect(likelySame('Ann Lee', 'Bo Lee')).toBe(false);
        expect(likelySame('Sam', 'Pam')).toBe(false);
    });

    it('merges a duplicate and re-points incidents with a new version', async () => {
        const { repos } = await freshVault();
        const john = await repos.people.findOrCreate('John Smith');
        const j = await repos.people.findOrCreate('J. Smith');
        const ann = await repos.people.findOrCreate('Ann Lee');
        const a = await repos.incidents.create(
            content({ responsibleIds: [j.id], witnesses: [{ personId: ann.id, statement: 'given' }] }),
        );
        const b = await repos.incidents.create(
            content({ responsibleIds: [john.id, j.id], witnesses: [{ personId: j.id, statement: 'not-asked' }] }),
        );
        expect(duplicateSuggestions(await repos.people.list()).map(([x, y]) => [x.name, y.name].sort())).toEqual([
            ['J. Smith', 'John Smith'],
        ]);

        const result = await mergePeople(repos, john.id, j.id);
        expect(result.incidentsUpdated).toBe(2);
        expect(result.person.aliases).toContain('J. Smith');
        expect((await repos.incidents.get(a.id))?.content.responsibleIds).toEqual([john.id]);
        const after = await repos.incidents.get(b.id);
        expect(after?.content.responsibleIds).toEqual([john.id]);
        expect(after?.version).toBe(2);
        expect(await repos.people.get(j.id)).toBeUndefined();
        expect((await repos.incidents.verify()).ok).toBe(true);
    });
});
