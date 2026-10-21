import { Combine, Search, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { duplicateSuggestions, involvement, mergePeople } from '@/lib/db';
import type { Person } from '@/lib/model/schema';

import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';

export const relationshipLabels: Record<NonNullable<Person['relationship']>, string> = {
    manager: 'Manager',
    colleague: 'Colleague',
    hr: 'HR',
    'senior-leader': 'Senior leader',
    client: 'Client or customer',
    other: 'Other',
};

/** Everyone named in the record, built automatically from incidents. */
export default function People() {
    const session = useSession();
    const toast = useToast();
    const [query, setQuery] = useState('');
    const [merging, setMerging] = useState<[Person, Person] | null>(null);
    const [dismissed, setDismissed] = useState<string[]>([]);
    const { data, loading } = useData(async (repos) => {
        const [people, incidents] = await Promise.all([repos.people.list(), repos.incidents.list()]);
        return {
            rows: people
                .map((p) => ({ person: p, ...involvement(p.id, incidents) }))
                .sort((a, b) => b.all.length - a.all.length || a.person.name.localeCompare(b.person.name)),
            suggestions: duplicateSuggestions(people),
        };
    });

    if (loading && !data) return <Skeleton className="mt-4 h-72" />;
    if (!data) return null;
    if (!data.rows.length)
        return (
            <EmptyState icon={<Users className="size-6" />} title="No one here yet">
                People appear automatically when you name someone in an incident, as responsible or as a witness.
            </EmptyState>
        );

    const q = query.trim().toLowerCase();
    const rows = data.rows.filter(
        (r) => !q || `${r.person.name} ${r.person.aliases.join(' ')} ${r.person.role ?? ''}`.toLowerCase().includes(q),
    );
    const suggestions = data.suggestions.filter(([a, b]) => !dismissed.includes(`${a.id}:${b.id}`));

    return (
        <div className="space-y-4 pt-2">
            {suggestions.slice(0, 3).map(([a, b]) => (
                <div key={`${a.id}:${b.id}`} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
                    <span className="icon-badge" data-tone="warn" aria-hidden>
                        <Combine className="size-4" />
                    </span>
                    <p className="min-w-0 flex-1 text-fg">
                        Are <strong>{a.name}</strong> and <strong>{b.name}</strong> the same person?
                    </p>
                    <Button size="sm" onClick={() => setMerging([a, b])}>
                        Merge
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDismissed([...dismissed, `${a.id}:${b.id}`])}>
                        Not the same
                    </Button>
                </div>
            ))}

            <div className="relative">
                <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                    aria-hidden
                />
                <label htmlFor="people-search" className="sr-only">
                    Search people
                </label>
                <Input
                    id="people-search"
                    type="search"
                    className="pl-9"
                    placeholder="Search names and roles"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map(({ person, responsible, witnessed, last }) => (
                    <li key={person.id}>
                        <NavLink
                            href={`/people/${person.id}`}
                            className="card flex h-full items-start gap-3 p-4 transition-colors hover:bg-raised focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                        >
                            <span
                                className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-tint font-display text-sm font-semibold text-accent-text"
                                aria-hidden
                            >
                                {initials(person.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-fg">{person.name}</p>
                                <p className="truncate text-xs text-fg-muted">
                                    {[person.relationship && relationshipLabels[person.relationship], person.role]
                                        .filter(Boolean)
                                        .join(' · ') || 'Role not added'}
                                </p>
                                <p className="mt-2 text-xs text-fg-subtle">
                                    {responsible.length > 0 && `Responsible in ${responsible.length}`}
                                    {responsible.length > 0 && witnessed.length > 0 && ' · '}
                                    {witnessed.length > 0 && `Witness to ${witnessed.length}`}
                                    {last &&
                                        ` · last ${new Date(last).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                                </p>
                            </div>
                        </NavLink>
                    </li>
                ))}
            </ul>

            <MergeDialog
                pair={merging}
                onOpenChange={(o) => !o && setMerging(null)}
                onMerge={async (keep, remove) => {
                    if (!session.repos) return;
                    const result = await mergePeople(session.repos, keep.id, remove.id);
                    session.refresh();
                    setMerging(null);
                    toast({
                        title: `Merged into ${keep.name}`,
                        description: `${result.incidentsUpdated} ${result.incidentsUpdated === 1 ? 'incident was' : 'incidents were'} updated; each change is in its history.`,
                        tone: 'success',
                    });
                }}
            />
        </div>
    );
}

export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join('');
}

export function MergeDialog({
    pair,
    onOpenChange,
    onMerge,
}: {
    pair: [Person, Person] | null;
    onOpenChange: (o: boolean) => void;
    onMerge: (keep: Person, remove: Person) => Promise<void>;
}) {
    const [keepId, setKeepId] = useState<string>('');
    const [busy, setBusy] = useState(false);
    if (!pair) return null;
    const keep = pair.find((p) => p.id === keepId) ?? (pair[0].name.length >= pair[1].name.length ? pair[0] : pair[1]);
    const remove = pair.find((p) => p.id !== keep.id)!;
    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent
                title="Merge two people"
                description="Incidents that name either will point to one person. Each change is recorded in that incident's history."
            >
                <Field label="Keep this name">
                    <Select value={keep.id} onChange={(e) => setKeepId(e.target.value)}>
                        {pair.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <p className="mt-3 text-sm text-fg-muted">
                    “{remove.name}” will be kept as another name for {keep.name}.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            await onMerge(keep, remove);
                            setBusy(false);
                        }}
                    >
                        <Combine aria-hidden /> Merge
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
