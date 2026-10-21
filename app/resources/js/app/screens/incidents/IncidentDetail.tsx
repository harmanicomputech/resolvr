import {
    ArrowLeft,
    ChevronDown,
    FileDown,
    History,
    Link2,
    MessageSquarePlus,
    Paperclip,
    Pencil,
    ShieldAlert,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Textarea } from '@/components/ui/field';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SeverityPill } from '@/components/ui/severity-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { linkFiles, type LedgerEntry } from '@/lib/db';
import { addedNotes, diffContent } from '@/lib/incidents/diff';
import type { EvidenceFile, Incident, Person } from '@/lib/model/schema';
import { cn } from '@/lib/utils';

import { AttachmentList } from '../../components/attachment-list';
import { PinConfirm } from '../../components/pin-confirm';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useNavigate } from '../../hooks/use-navigate';
import { haptic } from '../../lib/haptics';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';
import { ACCEPT, useAddFiles } from '../log/StepEvidence';

const dt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const opLabel: Record<string, string> = {
    create: 'Logged',
    edit: 'Edited',
    annotate: 'Note added',
    trash: 'Moved to trash',
    restore: 'Restored',
    import: 'Imported',
};
const statementLabel = {
    'not-asked': 'not asked yet',
    requested: 'statement requested',
    given: 'statement given',
    declined: 'declined',
} as const;

/** A document-style view of one incident, with its notes and append-only history. */
export default function IncidentDetail({ params }: { params: { id: string } }) {
    const session = useSession();
    const navigate = useNavigate();
    const toast = useToast();
    const addFiles = useAddFiles();
    const fileInput = useRef<HTMLInputElement>(null);
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const [note, setNote] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [linking, setLinking] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { data, loading } = useData(
        async (repos) => {
            const incident = await repos.incidents.get(params.id);
            if (!incident) return null;
            const [history, verdict, people, files, all] = await Promise.all([
                repos.incidents.history(incident.id),
                repos.incidents.verify(),
                repos.people.list(),
                repos.files.list({ includeDeleted: true }),
                repos.incidents.list(),
            ]);
            return {
                incident,
                history,
                verified: verdict.ok && !verdict.mismatchedIncidents.includes(incident.incId),
                people: new Map(people.map((p) => [p.id, p])),
                files: new Map(files.map((f) => [f.id, f])),
                others: all.filter((i) => i.id !== incident.id),
            };
        },
        [params.id],
    );

    if (loading && !data) return <DetailSkeleton />;
    if (!data)
        return (
            <EmptyState icon={<History className="size-6" />} title="Incident not found">
                It may have been deleted.
            </EmptyState>
        );
    const { incident, history, verified, people, files, others } = data;
    const c = incident.content;
    const repos = session.repos!;
    const name = (id: string) => people.get(id)?.name ?? 'Someone';
    const attached = c.attachmentIds.map((id) => files.get(id)).filter((f): f is EvidenceFile => Boolean(f));

    const updateContent = async (patch: Partial<typeof c>) => {
        const next = await repos.incidents.update(incident.id, { ...c, ...patch });
        if (patch.attachmentIds) await linkFiles(repos.files, incident.id, patch.attachmentIds, c.attachmentIds);
        session.refresh();
        return next;
    };

    const addNote = async () => {
        if (!note.trim()) return;
        await repos.incidents.annotate(incident.id, note);
        setNote('');
        haptic('success');
        session.refresh();
        toast({ title: 'Note added', description: 'It is timestamped and part of the record.', tone: 'success' });
    };

    const exportPdf = async () => {
        setExporting(true);
        try {
            const [{ downloadPdf, safeFilename }, { IncidentPdf }] = await Promise.all([
                import('../../pdf/download'),
                import('../../pdf/IncidentPdf'),
            ]);
            await downloadPdf(
                () => <IncidentPdf incident={incident} ctx={{ people, files }} history={history} verified={verified} />,
                `${incident.incId}-${safeFilename(c.title)}.pdf`,
            );
        } catch {
            toast({ title: 'The PDF could not be made', tone: 'danger' });
        } finally {
            setExporting(false);
        }
    };

    return (
        <article className="mx-auto max-w-3xl pt-2">
            <NavLink
                href="/incidents"
                className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
            >
                <ArrowLeft className="size-4" aria-hidden /> All incidents
            </NavLink>

            <header className="card p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-sm text-fg-muted">{incident.incId}</span>
                    <SeverityPill severity={c.severity} />
                    <span
                        className={cn(
                            'chip gap-1 text-xs',
                            verified ? 'text-success-text' : 'border-danger text-danger-text',
                        )}
                        title={incident.hash}
                    >
                        {verified ? (
                            <ShieldCheck className="size-3.5" aria-hidden />
                        ) : (
                            <ShieldAlert className="size-3.5" aria-hidden />
                        )}
                        {verified ? 'Hash verified' : 'Changed outside Resolvr'}
                    </span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg md:text-3xl">
                    {c.title}
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                    {dt(c.occurredAt)}
                    {c.location && ` · ${c.location}`}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                    First recorded {dt(incident.createdAt)}
                    {incident.version > 1 && ` · version ${incident.version}, ${dt(incident.updatedAt)}`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate(`/incidents/${incident.id}/edit`)}>
                        <Pencil aria-hidden /> Edit
                    </Button>
                    <Button size="sm" onClick={() => noteRef.current?.focus()}>
                        <MessageSquarePlus aria-hidden /> Add note
                    </Button>
                    <Button size="sm" onClick={() => fileInput.current?.click()}>
                        <Paperclip aria-hidden /> Add evidence
                    </Button>
                    <Button size="sm" onClick={() => setLinking(true)}>
                        <Link2 aria-hidden /> Link
                    </Button>
                    <Button size="sm" onClick={() => void exportPdf()} disabled={exporting}>
                        <FileDown aria-hidden /> {exporting ? 'Making PDF…' : 'PDF'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(true)} className="ml-auto">
                        <Trash2 aria-hidden /> Delete
                    </Button>
                </div>
                <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept={ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={async (e) => {
                        const ids = await addFiles(Array.from(e.target.files ?? []));
                        e.target.value = '';
                        if (ids.length) {
                            await updateContent({ attachmentIds: [...c.attachmentIds, ...ids] });
                            toast({
                                title: `${ids.length} ${ids.length === 1 ? 'file' : 'files'} added`,
                                tone: 'success',
                            });
                        }
                    }}
                />
            </header>

            <div className="card mt-4 divide-y divide-hairline px-5 md:px-6">
                <Section title="What happened">
                    <p className="whitespace-pre-wrap text-fg">{c.description}</p>
                    {c.context && <Pair label="What led up to it" value={c.context} />}
                    {c.response && <Pair label="How I responded" value={c.response} />}
                    {c.frequency && <Pair label="How often" value={c.frequency} />}
                </Section>
                <Section title="Type">
                    <ul className="flex flex-wrap gap-2">
                        {c.types.map((t) => (
                            <li key={t} className="chip">
                                {t}
                            </li>
                        ))}
                    </ul>
                    {c.typeOther && <p className="mt-2">{c.typeOther}</p>}
                </Section>
                <Section title="People">
                    <Pair
                        label="Responsible"
                        value={c.responsibleIds.map((id) => (
                            <PersonLink key={id} id={id} name={name(id)} />
                        ))}
                    />
                    <Pair
                        label="Witnesses"
                        value={c.witnesses.map((w) => (
                            <span key={w.personId}>
                                <PersonLink id={w.personId} name={name(w.personId)} />{' '}
                                <span className="text-fg-subtle">({statementLabel[w.statement]})</span>
                            </span>
                        ))}
                    />
                    {c.othersAffected && <Pair label="Others affected" value={c.othersAffected} />}
                    {c.corroboration && (
                        <Pair
                            label="Others with similar experiences"
                            value={`${c.corroboration}${c.corroborationNames ? `: ${c.corroborationNames}` : ''}`}
                        />
                    )}
                </Section>
                <Section title="Reporting">
                    <p>
                        {c.reported === 'yes'
                            ? `Reported to ${c.reportedTo || '–'}${c.reportedOn ? ` on ${c.reportedOn}` : ''}.`
                            : c.reported === 'informal'
                              ? `Mentioned informally to ${c.reportedTo || '–'}.`
                              : c.reported === 'no'
                                ? `Not reported yet${c.whyNotReported ? ` (${c.whyNotReported.toLowerCase()})` : ''}.`
                                : 'Not recorded.'}
                    </p>
                    {c.reportedResponse && <Pair label="Their response" value={c.reportedResponse} />}
                </Section>
                {(c.emotionalImpacts.length > 0 ||
                    c.physicalImpacts.length > 0 ||
                    c.professionalImpacts.length > 0 ||
                    c.impactStatement) && (
                    <Section title="Impact">
                        <p>{[...c.emotionalImpacts, ...c.physicalImpacts, ...c.professionalImpacts].join(', ')}</p>
                        {c.impactStatement && <p className="mt-2 whitespace-pre-wrap">{c.impactStatement}</p>}
                    </Section>
                )}
                <Section title={`Evidence (${attached.length})`}>
                    {c.evidenceCaptured.length > 0 && (
                        <p className="mb-3">Kept at the time: {c.evidenceCaptured.join(', ')}</p>
                    )}
                    {attached.length ? (
                        <AttachmentList files={attached} />
                    ) : (
                        <p className="text-fg-subtle">No files attached.</p>
                    )}
                </Section>
                {c.relatedIds.length > 0 && (
                    <Section title="Linked incidents">
                        <ul className="space-y-1">
                            {c.relatedIds.map((id) => {
                                const other = others.find((o) => o.id === id);
                                return other ? (
                                    <li key={id}>
                                        <NavLink href={`/incidents/${id}`} className="text-accent-text hover:underline">
                                            <span className="mono text-xs">{other.incId}</span> {other.content.title}
                                        </NavLink>
                                    </li>
                                ) : null;
                            })}
                        </ul>
                    </Section>
                )}
            </div>

            <section id="notes" className="card mt-4 p-5 md:p-6" aria-labelledby="notes-title">
                <h3 id="notes-title" className="font-medium text-fg">
                    Notes
                </h3>
                <p className="text-xs text-fg-subtle">
                    Notes are timestamped and cannot be edited, so your record shows what you knew and when.
                </p>
                <ol className="mt-4 space-y-3">
                    <AnimatePresence initial={false}>
                        {incident.annotations.map((a) => (
                            <motion.li
                                key={a.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="border-l-2 border-accent pl-3"
                            >
                                <p className="text-xs text-fg-subtle">{dt(a.at)}</p>
                                <p className="text-sm whitespace-pre-wrap text-fg">{a.text}</p>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ol>
                <form
                    className="mt-4 space-y-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void addNote();
                    }}
                >
                    <label htmlFor="new-note" className="sr-only">
                        Add a note
                    </label>
                    <Textarea
                        id="new-note"
                        ref={noteRef}
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Something new happened, or you remembered more…"
                    />
                    <Button type="submit" size="sm" variant="primary" disabled={!note.trim()}>
                        Add note
                    </Button>
                </form>
            </section>

            <VersionHistory history={history} people={people} files={files} others={others} />

            <PinConfirm
                open={deleting}
                onOpenChange={setDeleting}
                title={`Move ${incident.incId} to trash?`}
                description="You can restore it for 30 days. Its history stays in your record either way."
                confirmLabel="Move to trash"
                onConfirm={async () => {
                    await repos.incidents.trash(incident.id);
                    session.refresh();
                    toast({
                        title: `${incident.incId} moved to trash`,
                        action: {
                            label: 'Undo',
                            onClick: () => void repos.incidents.restore(incident.id).then(session.refresh),
                        },
                    });
                    navigate('/incidents');
                }}
            />
            <LinkSheet
                open={linking}
                onOpenChange={setLinking}
                incident={incident}
                others={others}
                onChange={(relatedIds) => void updateContent({ relatedIds })}
            />
        </article>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="py-5">
            <h3 className="eyebrow mb-2">{title}</h3>
            <div className="text-sm text-fg-muted">{children}</div>
        </section>
    );
}

function Pair({ label, value }: { label: string; value: ReactNode }) {
    const empty = Array.isArray(value) ? value.length === 0 : !value;
    return (
        <p className="mt-2">
            <span className="text-fg-subtle">{label}: </span>
            {empty ? '–' : Array.isArray(value) ? value.map((v, i) => [i > 0 && ', ', v]) : value}
        </p>
    );
}

function PersonLink({ id, name }: { id: string; name: string }) {
    return (
        <NavLink href={`/people/${id}`} className="text-fg hover:underline">
            {name}
        </NavLink>
    );
}

function VersionHistory({
    history,
    people,
    files,
    others,
}: {
    history: LedgerEntry[];
    people: Map<string, Person>;
    files: Map<string, EvidenceFile>;
    others: Incident[];
}) {
    const [open, setOpen] = useState<number | null>(null);
    const reduce = useReducedMotion();
    const names = {
        people,
        files: new Map([...files].map(([id, f]) => [id, f.name])),
        incidents: new Map(others.map((o) => [o.id, o.incId])),
    };
    return (
        <section className="card mt-4 p-5 md:p-6" aria-labelledby="history-title">
            <h3 id="history-title" className="flex items-center gap-2 font-medium text-fg">
                <History className="size-4 text-fg-subtle" aria-hidden /> Version history
            </h3>
            <p className="text-xs text-fg-subtle">
                Every change is added, never overwritten. Each version is chained to the one before by its fingerprint.
            </p>
            <ol className="mt-4 space-y-2">
                {[...history].reverse().map((entry, idx, arr) => {
                    const prev = arr[idx + 1];
                    const changes = prev
                        ? diffContent(prev.body.snapshot.content, entry.body.snapshot.content, names)
                        : [];
                    const notes = prev
                        ? addedNotes(prev.body.snapshot.annotations, entry.body.snapshot.annotations)
                        : [];
                    const expanded = open === entry.seq;
                    return (
                        <li key={entry.seq} className="rounded-(--radius-md) border border-hairline">
                            <button
                                type="button"
                                className="flex w-full items-center gap-3 p-3 text-left text-sm"
                                aria-expanded={expanded}
                                onClick={() => setOpen(expanded ? null : entry.seq)}
                            >
                                <span className="font-medium text-fg">
                                    v{entry.body.version} · {opLabel[entry.body.op]}
                                </span>
                                <span className="text-xs text-fg-subtle">{dt(entry.body.at)}</span>
                                <span className="mono ml-auto hidden text-2xs text-fg-subtle sm:inline">
                                    {entry.hash.slice(0, 16)}…
                                </span>
                                <ChevronDown
                                    className={cn(
                                        'size-4 text-fg-subtle transition-transform',
                                        expanded && 'rotate-180',
                                    )}
                                    aria-hidden
                                />
                            </button>
                            <AnimatePresence initial={false}>
                                {expanded && (
                                    <motion.div
                                        initial={reduce ? false : { height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-2 border-t border-hairline p-3 text-sm">
                                            {!prev && (
                                                <p className="text-fg-muted">
                                                    {entry.body.op === 'import'
                                                        ? 'Imported from an earlier Resolvr backup.'
                                                        : 'The first version, as originally logged.'}
                                                </p>
                                            )}
                                            {changes.map((ch) => (
                                                <div key={ch.field}>
                                                    <p className="text-xs font-medium text-fg">{ch.label}</p>
                                                    <p className="text-fg-subtle line-through decoration-hairline-strong">
                                                        {ch.before}
                                                    </p>
                                                    <p className="text-fg">{ch.after}</p>
                                                </div>
                                            ))}
                                            {notes.map((n) => (
                                                <p key={n.id} className="text-fg">
                                                    <span className="text-xs text-fg-subtle">Note: </span>
                                                    {n.text}
                                                </p>
                                            ))}
                                            {prev && !changes.length && !notes.length && (
                                                <p className="text-fg-muted">
                                                    {opLabel[entry.body.op]}; no content changed.
                                                </p>
                                            )}
                                            <p className="mono pt-1 text-2xs break-all text-fg-subtle">
                                                hash {entry.hash}
                                                <br />
                                                prev {entry.prevHash}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function LinkSheet({
    open,
    onOpenChange,
    incident,
    others,
    onChange,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    incident: Incident;
    others: Incident[];
    onChange: (ids: string[]) => void;
}) {
    const [selected, setSelected] = useState(incident.content.relatedIds);
    return (
        <Sheet
            open={open}
            onOpenChange={(o) => {
                onOpenChange(o);
                if (o) setSelected(incident.content.relatedIds);
            }}
        >
            <SheetContent
                side="right"
                title="Link related incidents"
                description="Show that incidents belong together, for example a complaint and what happened after it."
                className="w-full max-w-md"
            >
                {others.length ? (
                    <ul className="space-y-1">
                        {others.map((o) => (
                            <li key={o.id}>
                                <label className="flex cursor-pointer items-start gap-3 rounded-(--radius-md) p-2 text-sm hover:bg-raised">
                                    <input
                                        type="checkbox"
                                        className="mt-1 size-4 accent-[var(--accent)]"
                                        checked={selected.includes(o.id)}
                                        onChange={(e) =>
                                            setSelected(
                                                e.target.checked
                                                    ? [...selected, o.id]
                                                    : selected.filter((x) => x !== o.id),
                                            )
                                        }
                                    />
                                    <span>
                                        <span className="mono text-xs text-fg-subtle">{o.incId}</span>{' '}
                                        <span className="text-fg">{o.content.title}</span>
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-fg-muted">There are no other incidents to link yet.</p>
                )}
                <Button
                    variant="primary"
                    className="mt-4 w-full"
                    onClick={() => {
                        onChange(selected);
                        onOpenChange(false);
                    }}
                    disabled={JSON.stringify(selected) === JSON.stringify(incident.content.relatedIds)}
                >
                    Save links
                </Button>
            </SheetContent>
        </Sheet>
    );
}

function DetailSkeleton() {
    return (
        <div className="mx-auto max-w-3xl space-y-4 pt-8" aria-busy="true" aria-label="Opening incident">
            <Skeleton className="h-40" />
            <Skeleton className="h-72" />
        </div>
    );
}
