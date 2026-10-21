import { normalizeName } from '../model/people';
import { personSchema, type Person } from '../model/schema';
import type { Vault } from './vault';

/** People mentioned in the record, de-duplicated by normalised name. */
export class PeopleRepository {
    constructor(private readonly vault: Vault) {}

    list(): Promise<Person[]> {
        return this.vault.list<Person>('person');
    }

    get(id: string): Promise<Person | undefined> {
        return this.vault.get<Person>('person', id);
    }

    /** Find a person by name or alias, or add them. Returns the stored person. */
    async findOrCreate(name: string, extra: Partial<Pick<Person, 'role' | 'relationship'>> = {}): Promise<Person> {
        const key = normalizeName(name);
        if (!key) throw new Error('A name is required');
        return this.vault.exclusive(async () => {
            const existing = (await this.list()).find(
                (p) => p.normalizedName === key || p.aliases.map(normalizeName).includes(key),
            );
            if (existing) return existing;
            const person = personSchema.parse({
                id: crypto.randomUUID(),
                name: name.trim(),
                normalizedName: key,
                aliases: [],
                createdAt: new Date().toISOString(),
                ...extra,
            });
            await this.vault.put('person', person.id, person);
            return person;
        });
    }

    async update(person: Person): Promise<Person> {
        const parsed = personSchema.parse({ ...person, normalizedName: normalizeName(person.name) });
        await this.vault.put('person', parsed.id, parsed);
        return parsed;
    }

    /**
     * Merge duplicates (P2.9): keeps `keepId`, records the other's name as an
     * alias and returns the removed id so callers can re-point references.
     */
    async merge(keepId: string, removeId: string): Promise<Person> {
        const [keep, remove] = await Promise.all([this.get(keepId), this.get(removeId)]);
        if (!keep || !remove) throw new Error('Person not found');
        const merged = { ...keep, aliases: [...new Set([...keep.aliases, remove.name, ...remove.aliases])] };
        await this.vault.putMany([{ kind: 'person', id: keep.id, value: merged }]);
        await this.vault.remove('person', remove.id);
        return merged;
    }
}
