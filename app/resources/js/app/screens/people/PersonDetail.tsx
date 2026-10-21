import { ArrowLeft, Combine, Save } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import { SeverityPill } from '@/components/ui/severity-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { involvement, mergePeople } from '@/lib/db';
import type { Incident, Person, Witness } from '@/lib/model/schema';

import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useNavigate } from '../../hooks/use-navigate';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';
import { initials, MergeDialog, relationshipLabels } from './People';

const statementLabels: Record<Witness['statement'], string> = {
    'not-asked': 'Not asked yet',
    requested: 'Asked for a statement',
    given: 'Statement given',
    declined: 'Declined',
};

/** One person: who they are to you, their timeline, and witness statements. */
export default function PersonDetail({ params }: { params: { id: string } }) {
    const session = useSession();
    const toast = useToast();
    const navigate = useNavigate();
    const [merging, setMerging] = useState<[Person, Person] | null>(null);
    const { data, loading } = useData(
        async (repos) => {
            const person = await repos.people.get(params.id);
            if (!person) return null;
            const [incidents, people] = await Promise.all([repos.incidents.list(), repos.people.list()]);
            return { person, others: people.filter((p) => p.id !== person.id), ...involvement(person.id, incidents) };
        },
        [params.id],
    );

    if (loading && !data) return <Skeleton className="mt-4 h-72" />;
    if (!data)
        return (
            <EmptyState icon={<Combine className="size-6" />} title="Person not found">
                They may have been merged with someone else.
            </EmptyState>
        );
    const { person, all, witnessed, others } = data;
    const repos = session.repos!;

    const setStatement = async (incident: Incident, statement: Witness['statement']) => {
        const witnesses = incident.content.witnesses.map((w) => (w.personId === person.id ? { ...w, statement } : w));
        await repos.incidents.update(incident.id, { ...incident.content, witnesses });
        session.refresh();
        toast({
            title: 'Statement status saved',
            description: `${incident.incId} has a new version.`,
            tone: 'success',
        });
    };

    return (
        <div className="mx-auto max-w-3xl space-y-4 pt-2">
            <NavLink href="/people" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
                <ArrowLeft className="size-4" aria-hidden /> All people
            </NavLink>

            <ProfileCard key={person.id + person.name} person={person} />

            {witnessed.length > 0 && (
                <section className="card p-5" aria-labelledby="witness-title">
                    <h3 id="witness-title" className="font-medium text-fg">
                        As a witness
                    </h3>
                    <p className="text-xs text-fg-subtle">
                        Track whether you have asked {person.name} for a statement.
                    </p>
                    <ul className="mt-3 divide-y divide-hairline">
                        {witnessed.map((i) => {
                            const w = i.content.witnesses.find((x) => x.personId === person.id)!;
                            return (
                                <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <NavLink
                                        href={`/incidents/${i.id}`}
                                        className="min-w-0 flex-1 text-sm hover:underline"
                                    >
                                        <span className="mono text-xs text-fg-subtle">{i.incId}</span>{' '}
                                        <span className="text-fg">{i.content.title}</span>
                                    </NavLink>
                                    <label className="sr-only" htmlFor={`st-${i.id}`}>
                                        Statement for {i.incId}
                                    </label>
                                    <Select
                                        id={`st-${i.id}`}
                                        className="w-auto"
                                        value={w.statement}
                                        onChange={(e) => void setStatement(i, e.target.value as Witness['statement'])}
                                    >
                                        {Object.entries(statementLabels).map(([v, l]) => (
                                            <option key={v} value={v}>
                                                {l}
                                            </option>
                                        ))}
                                    </Select>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <section className="card p-5" aria-labelledby="person-timeline">
                <h3 id="person-timeline" className="font-medium text-fg">
                    Timeline ({all.length})
                </h3>
                <ol className="relative mt-4 ml-2 border-l-2 border-hairline">
                    {all.map((i) => (
                        <li key={i.id} className="relative pb-4 pl-5">
                            <span className="absolute top-1.5 -left-[5px] size-2 rounded-full bg-accent" aria-hidden />
                            <p className="text-xs text-fg-subtle">
                                {new Date(i.occurredAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} ·{' '}
                                {i.content.responsibleIds.includes(person.id) ? 'Responsible' : 'Witness'}
                            </p>
                            <NavLink
                                href={`/incidents/${i.id}`}
                                className="mt-0.5 flex items-center gap-2 text-sm hover:underline"
                            >
                                <SeverityPill severity={i.content.severity} />
                                <span className="text-fg">{i.content.title}</span>
                            </NavLink>
                        </li>
                    ))}
                </ol>
            </section>

            {others.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                    <Combine className="size-4 text-fg-subtle" aria-hidden />
                    <label htmlFor="merge-with" className="text-fg-muted">
                        Same person as
                    </label>
                    <Select
                        id="merge-with"
                        className="w-auto"
                        value=""
                        onChange={(e) =>
                            e.target.value && setMerging([person, others.find((o) => o.id === e.target.value)!])
                        }
                    >
                        <option value="">Choose…</option>
                        {others.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name}
                            </option>
                        ))}
                    </Select>
                </div>
            )}

            <MergeDialog
                pair={merging}
                onOpenChange={(o) => !o && setMerging(null)}
                onMerge={async (keep, remove) => {
                    const result = await mergePeople(repos, keep.id, remove.id);
                    session.refresh();
                    setMerging(null);
                    toast({
                        title: `Merged into ${keep.name}`,
                        description: `${result.incidentsUpdated} incidents updated.`,
                        tone: 'success',
                    });
                    if (keep.id !== person.id) navigate(`/people/${keep.id}`, { replace: true });
                }}
            />
        </div>
    );
}

function ProfileCard({ person }: { person: Person }) {
    const session = useSession();
    const toast = useToast();
    const [name, setName] = useState(person.name);
    const [role, setRole] = useState(person.role ?? '');
    const [relationship, setRelationship] = useState(person.relationship ?? '');
    const dirty = name !== person.name || role !== (person.role ?? '') || relationship !== (person.relationship ?? '');

    return (
        <form
            className="card p-5"
            onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim() || !session.repos) return;
                await session.repos.people.update({
                    ...person,
                    name: name.trim(),
                    role: role.trim() || undefined,
                    relationship: (relationship || undefined) as Person['relationship'],
                    aliases:
                        name.trim() !== person.name ? [...new Set([...person.aliases, person.name])] : person.aliases,
                });
                session.refresh();
                toast({ title: 'Saved', tone: 'success' });
            }}
        >
            <div className="flex items-center gap-3">
                <span
                    className="grid size-12 place-items-center rounded-full bg-accent-tint font-display font-semibold text-accent-text"
                    aria-hidden
                >
                    {initials(person.name)}
                </span>
                <div>
                    <h2 className="font-display text-xl font-semibold text-fg">{person.name}</h2>
                    {person.aliases.length > 0 && (
                        <p className="text-xs text-fg-subtle">Also written as {person.aliases.join(', ')}</p>
                    )}
                </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Role">
                    <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Team lead" />
                </Field>
                <Field label="Who they are to you">
                    <Select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                        <option value="">Not set</option>
                        {Object.entries(relationshipLabels).map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </Select>
                </Field>
            </div>
            {dirty && (
                <Button type="submit" variant="primary" size="sm" className="mt-4">
                    <Save aria-hidden /> Save
                </Button>
            )}
        </form>
    );
}
