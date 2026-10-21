import { ArrowDownUp, Bookmark, FileClock, ListFilter, NotebookPen, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SeverityPill } from '@/components/ui/severity-pill';
import { Skeleton } from '@/components/ui/skeleton';
import {
    activeFilterCount,
    emptyFilter,
    filterIncidents,
    type IncidentFilter,
    type IncidentSort,
} from '@/lib/incidents/filter';
import { allIncidentTypes, severities } from '@/lib/model/catalog';
import type { Draft } from '@/lib/model/draft';
import type { Incident, Person } from '@/lib/model/schema';
import { cn } from '@/lib/utils';

import { ChipGroup } from '../../components/chip-group';
import { PinConfirm } from '../../components/pin-confirm';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useNavigate } from '../../hooks/use-navigate';
import { haptic } from '../../lib/haptics';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';
import { severityInfo } from '../log/steps';

const sortLabels: Record<IncidentSort, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    severity: 'Most serious first',
};
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** The incident log: search, filters, sort, saved views, drafts and swipe actions. */
export default function IncidentList() {
    const session = useSession();
    const navigate = useNavigate();
    const toast = useToast();
    const [filter, setFilter] = useState<IncidentFilter>(emptyFilter);
    const [sort, setSort] = useState<IncidentSort>('newest');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [deleting, setDeleting] = useState<Incident | null>(null);
    const [viewName, setViewName] = useState<string | null>(null);
    const { data, loading } = useData(async (repos) => {
        const [incidents, trashed, people, drafts, views] = await Promise.all([
            repos.incidents.list(),
            repos.incidents.list({ includeDeleted: true }),
            repos.people.list(),
            repos.drafts.list(),
            repos.views.list(),
        ]);
        return {
            incidents,
            trashCount: trashed.length - incidents.length,
            people,
            peopleById: new Map(people.map((p) => [p.id, p])),
            drafts,
            views,
        };
    });

    const shown = useMemo(
        () => (data ? filterIncidents(data.incidents, filter, sort, data.peopleById) : []),
        [data, filter, sort],
    );
    const filters = activeFilterCount(filter);

    if (loading && !data) return <ListSkeleton />;
    if (!data) return null;

    const saveView = async () => {
        if (!viewName?.trim() || !session.repos) return;
        await session.repos.views.save({ name: viewName.trim(), filter, sort });
        setViewName(null);
        session.refresh();
        toast({ title: 'View saved', tone: 'success' });
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-60">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                        aria-hidden
                    />
                    <label htmlFor="incident-search" className="sr-only">
                        Search incidents
                    </label>
                    <Input
                        id="incident-search"
                        type="search"
                        className="pl-9"
                        placeholder="Search words, names or INC numbers"
                        value={filter.query}
                        onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                    />
                </div>
                <Button
                    onClick={() => setFiltersOpen(true)}
                    aria-label={`Filters${filters ? `, ${filters} active` : ''}`}
                >
                    <ListFilter aria-hidden /> Filters
                    {filters > 0 && (
                        <span className="grid size-5 place-items-center rounded-full bg-accent text-2xs text-accent-fg">
                            {filters}
                        </span>
                    )}
                </Button>
                <label className="sr-only" htmlFor="incident-sort">
                    Sort
                </label>
                <div className="relative">
                    <ArrowDownUp
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                        aria-hidden
                    />
                    <Select
                        id="incident-sort"
                        className="w-auto pl-9"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as IncidentSort)}
                    >
                        {Object.entries(sortLabels).map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </Select>
                </div>
                <Button variant="primary" onClick={() => navigate('/log')} className="hidden md:inline-flex">
                    <Plus aria-hidden /> Log incident
                </Button>
            </div>

            {(data.views.length > 0 || filters > 0 || filter.query) && (
                <div className="flex flex-wrap items-center gap-2">
                    {data.views.map((v) => (
                        <span key={v.id} className="chip gap-1 pr-1">
                            <button
                                type="button"
                                className="flex items-center gap-1"
                                onClick={() => (setFilter(v.filter), setSort(v.sort))}
                            >
                                <Bookmark className="size-3.5" aria-hidden /> {v.name}
                            </button>
                            <button
                                type="button"
                                className="grid size-5 place-items-center rounded-full hover:bg-raised"
                                aria-label={`Delete view ${v.name}`}
                                onClick={() =>
                                    session.repos && void session.repos.views.remove(v.id).then(session.refresh)
                                }
                            >
                                <X className="size-3" aria-hidden />
                            </button>
                        </span>
                    ))}
                    {(filters > 0 || filter.query) && (
                        <>
                            {viewName === null ? (
                                <Button variant="ghost" size="sm" onClick={() => setViewName(filter.query || '')}>
                                    <Bookmark aria-hidden /> Save this view
                                </Button>
                            ) : (
                                <form
                                    className="flex items-center gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        void saveView();
                                    }}
                                >
                                    <label htmlFor="view-name" className="sr-only">
                                        View name
                                    </label>
                                    <Input
                                        id="view-name"
                                        autoFocus
                                        className="h-9 w-40"
                                        placeholder="Name this view"
                                        value={viewName}
                                        onChange={(e) => setViewName(e.target.value)}
                                    />
                                    <Button type="submit" size="sm" disabled={!viewName.trim()}>
                                        Save
                                    </Button>
                                </form>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setFilter(emptyFilter)}>
                                Clear
                            </Button>
                        </>
                    )}
                </div>
            )}

            {data.drafts.length > 0 && <Drafts drafts={data.drafts} />}

            <p className="text-sm text-fg-muted" aria-live="polite">
                {shown.length === data.incidents.length
                    ? `${shown.length} ${shown.length === 1 ? 'incident' : 'incidents'}`
                    : `Showing ${shown.length} of ${data.incidents.length}`}
            </p>

            {data.incidents.length === 0 ? (
                <EmptyState
                    icon={<NotebookPen className="size-6" />}
                    title="No incidents yet"
                    action={
                        <Button variant="primary" onClick={() => navigate('/log')}>
                            Log your first incident
                        </Button>
                    }
                >
                    Each incident you log is dated and sealed so it holds up later.
                </EmptyState>
            ) : shown.length === 0 ? (
                <EmptyState icon={<Search className="size-6" />} title="Nothing matches">
                    Try fewer filters or different words.
                </EmptyState>
            ) : (
                <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                        {shown.map((incident) => (
                            <IncidentRow
                                key={incident.id}
                                incident={incident}
                                peopleById={data.peopleById}
                                onDelete={() => setDeleting(incident)}
                            />
                        ))}
                    </AnimatePresence>
                </ul>
            )}

            {data.trashCount > 0 && (
                <NavLink
                    href="/incidents/trash"
                    className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
                >
                    <Trash2 className="size-4" aria-hidden /> Trash ({data.trashCount})
                </NavLink>
            )}

            <FilterSheet
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                filter={filter}
                onChange={setFilter}
                people={data.people}
            />
            <PinConfirm
                open={Boolean(deleting)}
                onOpenChange={(o) => !o && setDeleting(null)}
                title={`Move ${deleting?.incId ?? ''} to trash?`}
                description="You can restore it for 30 days. Its history stays in your record either way."
                confirmLabel="Move to trash"
                onConfirm={async () => {
                    if (!deleting || !session.repos) return;
                    await session.repos.incidents.trash(deleting.id);
                    session.refresh();
                    const id = deleting.id;
                    toast({
                        title: `${deleting.incId} moved to trash`,
                        action: {
                            label: 'Undo',
                            onClick: () =>
                                session.repos && void session.repos.incidents.restore(id).then(session.refresh),
                        },
                    });
                }}
            />
        </div>
    );
}

function IncidentRow({
    incident,
    peopleById,
    onDelete,
}: {
    incident: Incident;
    peopleById: Map<string, Person>;
    onDelete: () => void;
}) {
    const reduce = useReducedMotion();
    const navigate = useNavigate();
    const [revealed, setRevealed] = useState(false);
    const c = incident.content;
    const person = c.responsibleIds[0] ? peopleById.get(c.responsibleIds[0])?.name : undefined;
    return (
        <motion.li
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="relative overflow-hidden rounded-(--radius-lg)"
        >
            {/* Swipe actions (phones): revealed behind the row. */}
            <div className="absolute inset-y-0 right-0 flex md:hidden" aria-hidden={!revealed}>
                <button
                    type="button"
                    tabIndex={revealed ? 0 : -1}
                    className="grid w-20 place-items-center bg-accent-tint text-xs font-medium text-accent-text"
                    onClick={() => navigate(`/incidents/${incident.id}#notes`)}
                >
                    Add note
                </button>
                <button
                    type="button"
                    tabIndex={revealed ? 0 : -1}
                    className="grid w-20 place-items-center bg-danger text-xs font-medium text-danger-fg"
                    onClick={onDelete}
                >
                    Delete
                </button>
            </div>
            <motion.div
                drag={reduce ? false : 'x'}
                dragDirectionLock
                dragConstraints={{ left: -160, right: 0 }}
                dragElastic={0.05}
                animate={{ x: revealed ? -160 : 0 }}
                onDragEnd={(_, info) => {
                    const open = info.offset.x < -60;
                    if (open !== revealed) haptic('tap');
                    setRevealed(open);
                }}
                className="relative bg-bg"
            >
                <NavLink
                    href={`/incidents/${incident.id}`}
                    className="card flex items-start gap-3 p-4 transition-colors hover:bg-raised focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                    onClick={(e) => revealed && (e.preventDefault(), setRevealed(false))}
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <SeverityPill severity={c.severity} />
                            <span className="mono text-xs text-fg-subtle">{incident.incId}</span>
                            {incident.version > 1 && (
                                <span className="text-2xs text-fg-subtle">v{incident.version}</span>
                            )}
                        </div>
                        <p className="mt-1.5 truncate font-medium text-fg">{c.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{c.description}</p>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-subtle">
                            <span>{dateFmt.format(new Date(incident.occurredAt))}</span>
                            {person && <span>{person}</span>}
                            <span className="truncate">{c.types.slice(0, 2).join(', ')}</span>
                            {c.attachmentIds.length > 0 && (
                                <span>
                                    {c.attachmentIds.length} {c.attachmentIds.length === 1 ? 'file' : 'files'}
                                </span>
                            )}
                        </p>
                    </div>
                </NavLink>
                <button
                    type="button"
                    className="btn absolute top-3 right-3 hidden md:inline-flex"
                    data-variant="ghost"
                    data-size="icon"
                    onClick={onDelete}
                    aria-label={`Move ${incident.incId} to trash`}
                >
                    <Trash2 aria-hidden />
                </button>
            </motion.div>
        </motion.li>
    );
}

function Drafts({ drafts }: { drafts: Draft[] }) {
    const session = useSession();
    const [confirming, setConfirming] = useState<string | null>(null);
    return (
        <section aria-labelledby="drafts-title" className="card p-4">
            <h2 id="drafts-title" className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
                <FileClock className="size-4 text-fg-subtle" aria-hidden /> Unfinished ({drafts.length})
            </h2>
            <ul className="divide-y divide-hairline">
                {drafts.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-2">
                        <NavLink
                            href={d.incidentId ? `/incidents/${d.incidentId}/edit` : `/log?draft=${d.id}`}
                            className="min-w-0 flex-1 text-sm hover:underline"
                        >
                            <span className="block truncate text-fg">{d.form.title || 'Untitled'}</span>
                            <span className="text-xs text-fg-subtle">
                                {d.quick ? 'Quick capture' : d.incidentId ? 'Unsaved edit' : `Step ${d.step + 1} of 8`}{' '}
                                ·{' '}
                                {new Date(d.updatedAt).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </span>
                        </NavLink>
                        {confirming === d.id ? (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                    void session.repos?.drafts
                                        .remove(d.id, { discardFiles: true })
                                        .then(session.refresh)
                                }
                                onBlur={() => setConfirming(null)}
                                autoFocus
                            >
                                Discard draft and its files
                            </Button>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => setConfirming(d.id)}>
                                Discard
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}

function FilterSheet({
    open,
    onOpenChange,
    filter,
    onChange,
    people,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    filter: IncidentFilter;
    onChange: (f: IncidentFilter) => void;
    people: Person[];
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" title="Filters" className="w-full max-w-md">
                <div className="space-y-6">
                    <fieldset>
                        <legend className="mb-2 text-sm font-medium text-fg">Severity</legend>
                        <div className="flex flex-wrap gap-2">
                            {severities.map((s) => (
                                <Chip
                                    key={s}
                                    selected={filter.severities.includes(s)}
                                    onSelectedChange={(on) =>
                                        onChange({
                                            ...filter,
                                            severities: on
                                                ? [...filter.severities, s]
                                                : filter.severities.filter((x) => x !== s),
                                        })
                                    }
                                >
                                    {severityInfo[s].label}
                                </Chip>
                            ))}
                        </div>
                    </fieldset>
                    {people.length > 0 && (
                        <ChipGroup
                            label="People"
                            options={people.map((p) => ({ value: p.id, label: p.name }))}
                            value={filter.personIds}
                            onChange={(personIds) => onChange({ ...filter, personIds })}
                        />
                    )}
                    <Field label="Type">
                        <Select
                            value={filter.types[0] ?? ''}
                            onChange={(e) => onChange({ ...filter, types: e.target.value ? [e.target.value] : [] })}
                        >
                            <option value="">Any type</option>
                            {allIncidentTypes.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="From">
                            <Input
                                type="date"
                                value={filter.from ?? ''}
                                onChange={(e) => onChange({ ...filter, from: e.target.value || undefined })}
                            />
                        </Field>
                        <Field label="To">
                            <Input
                                type="date"
                                value={filter.to ?? ''}
                                onChange={(e) => onChange({ ...filter, to: e.target.value || undefined })}
                            />
                        </Field>
                    </div>
                    <Field label="Reported">
                        <Select
                            value={filter.reported ?? ''}
                            onChange={(e) =>
                                onChange({
                                    ...filter,
                                    reported: (e.target.value || undefined) as IncidentFilter['reported'],
                                })
                            }
                        >
                            <option value="">Any</option>
                            <option value="yes">Reported formally</option>
                            <option value="informal">Reported informally</option>
                            <option value="no">Not reported</option>
                            <option value="unknown">Not recorded</option>
                        </Select>
                    </Field>
                    <div className={cn('flex gap-2')}>
                        <Button variant="ghost" onClick={() => onChange({ ...emptyFilter, query: filter.query })}>
                            Reset
                        </Button>
                        <Button variant="primary" className="flex-1" onClick={() => onOpenChange(false)}>
                            Show results
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function ListSkeleton() {
    return (
        <div className="space-y-3 pt-2" aria-busy="true" aria-label="Opening your incidents">
            <Skeleton className="h-11" />
            {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28" />
            ))}
        </div>
    );
}
