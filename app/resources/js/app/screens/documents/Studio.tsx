import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import {
    ArrowLeft,
    Bold,
    ChevronDown,
    Copy,
    FileDown,
    FileType2,
    Italic,
    List,
    RefreshCw,
    Sparkles,
    Square,
    Trash2,
    WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from 'wouter';

import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SeverityPill } from '@/components/ui/severity-pill';
import { Skeleton } from '@/components/ui/skeleton';
import {
    documentTypes,
    type CaseProfile,
    type DocumentType,
    type DraftDocument,
    type EvidenceFile,
    type Incident,
    type Person,
} from '@/lib/model/schema';
import { cn } from '@/lib/utils';

import { ChipGroup } from '../../components/chip-group';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useNavigate } from '../../hooks/use-navigate';
import { DraftError, streamDraft, textToHtml } from '../../lib/ai';
import { htmlToBlocks, htmlToText, toDocx } from '../../lib/doc-export';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';
import { buildPayload, defaultFields, documentTypeInfo, fieldOptions, type FieldId } from './payload';

const tones = [
    { value: 'formal', label: 'Formal' },
    { value: 'firm', label: 'Firm' },
    { value: 'urgent', label: 'Urgent' },
] as const;
const outcomes = {
    investigation: 'An investigation',
    mediation: 'Mediation',
    discipline: 'Action on the person responsible',
    transfer: 'A change of team or manager',
    cessation: 'For it to stop',
} as const;
const rewrites = [
    'Make it clearer',
    'Make it firmer',
    'Make it calmer',
    'Make it shorter',
    'Add a little more detail from the record',
] as const;

/** The document studio: choose what to send, draft, then edit freely. */
export default function Studio({ params }: { params: { id: string } }) {
    const session = useSession();
    const toast = useToast();
    const navigate = useNavigate();
    const search = new URLSearchParams(useSearch());
    // A draft created here keeps the same editor when the URL gains its id.
    const [createdId, setCreatedId] = useState<string | null>(null);
    const docId = params.id === 'new' || params.id === createdId ? null : params.id;
    const { data, loading } = useData(
        async (repos) => {
            const [incidents, people, files, profile, existing] = await Promise.all([
                repos.incidents.list(),
                repos.people.list(),
                repos.files.list(),
                repos.singletons.profile(),
                docId ? repos.documents.get(docId) : undefined,
            ]);
            return {
                incidents,
                people: new Map(people.map((p) => [p.id, p])),
                files: new Map(files.map((f) => [f.id, f])),
                profile,
                existing,
            };
        },
        [docId ?? 'new'],
    );
    if (loading && !data) return <Skeleton className="mt-4 h-96" />;
    if (!data) return null;
    const requested = search.get('type') as DocumentType | null;
    const type = data.existing?.type ?? (requested && documentTypes.includes(requested) ? requested : 'hr-complaint');
    return (
        <StudioInner
            key={data.existing?.id ?? type}
            {...data}
            type={type}
            onSaved={(id) => {
                if (docId) return;
                setCreatedId(id);
                navigate(`/documents/${id}`, { replace: true });
            }}
            session={session}
            toast={toast}
        />
    );
}

interface Loaded {
    incidents: Incident[];
    people: Map<string, Person>;
    files: Map<string, EvidenceFile>;
    profile: CaseProfile;
    existing?: DraftDocument;
}

function StudioInner({
    incidents,
    people,
    files,
    profile: initialProfile,
    existing,
    type,
    onSaved,
    session,
    toast,
}: Loaded & {
    type: DocumentType;
    onSaved: (id: string) => void;
    session: ReturnType<typeof useSession>;
    toast: ReturnType<typeof useToast>;
}) {
    const [profile, setProfile] = useState<CaseProfile>(initialProfile);
    const [tone, setTone] = useState<DraftDocument['tone']>(existing?.tone ?? 'formal');
    const [outcome, setOutcome] = useState<DraftDocument['outcome']>(existing?.outcome ?? 'investigation');
    const [context, setContext] = useState(existing?.context ?? '');
    const [selected, setSelected] = useState<string[]>(existing?.incidentIds ?? incidents.slice(0, 8).map((i) => i.id));
    const [fields, setFields] = useState<FieldId[]>((existing?.fields as FieldId[]) ?? defaultFields);
    const [doc, setDoc] = useState<DraftDocument | null>(existing ?? null);
    const [streaming, setStreaming] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [setupOpen, setSetupOpen] = useState(!existing);
    const abort = useRef<AbortController | null>(null);
    const saveTimer = useRef<number | undefined>(undefined);
    const pendingHtml = useRef<string | null>(null);
    const jurisdiction = session.settings?.jurisdiction ?? profile.jurisdiction ?? 'us';

    const payload = useMemo(
        () =>
            buildPayload({
                type,
                tone,
                outcome,
                jurisdiction,
                context,
                profile,
                incidents: incidents.filter((i) => selected.includes(i.id)),
                fields,
                people,
                files,
            }),
        [type, tone, outcome, jurisdiction, context, profile, incidents, selected, fields, people, files],
    );
    const payloadText = JSON.stringify(payload, null, 2);

    const persist = async (html: string, extra: Partial<DraftDocument> = {}) => {
        if (!session.repos) return;
        const base: DraftDocument = doc ?? {
            id: crypto.randomUUID(),
            type,
            title: `${documentTypeInfo[type].title}, ${new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}`,
            html: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tone,
            outcome,
            incidentIds: [],
            fields: [],
            context: '',
        };
        const saved = await session.repos.documents.save({
            ...base,
            html,
            tone,
            outcome,
            incidentIds: selected,
            fields,
            context,
            ...extra,
        });
        setDoc(saved);
        if (!doc) onSaved(saved.id);
    };

    // The editor keeps its first callbacks; route saves through a ref so they see the current draft.
    const persistRef = useRef(persist);
    useEffect(() => {
        persistRef.current = persist;
    });

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                code: false,
                codeBlock: false,
                blockquote: false,
                horizontalRule: false,
                link: false,
            }),
        ],
        content: existing?.html ?? '',
        injectCSS: false,
        editorProps: {
            attributes: {
                class: 'tiptap-doc',
                'aria-label': 'Document text',
                role: 'textbox',
                'aria-multiline': 'true',
            },
        },
        onUpdate: ({ editor: e }) => {
            if (!e.isEditable) return;
            pendingHtml.current = e.getHTML();
            window.clearTimeout(saveTimer.current);
            saveTimer.current = window.setTimeout(() => {
                if (pendingHtml.current !== null) void persistRef.current(pendingHtml.current);
                pendingHtml.current = null;
            }, 700);
        },
    });

    // Leaving the page: stop any draft in progress and save unsaved edits now.
    useEffect(
        () => () => {
            abort.current?.abort();
            window.clearTimeout(saveTimer.current);
            if (pendingHtml.current !== null) void persistRef.current(pendingHtml.current);
        },
        [],
    );

    const generate = async () => {
        if (!editor) return;
        if (!selected.length && type !== 'follow-up-email') {
            toast({ title: 'Choose at least one incident', tone: 'warning' });
            return;
        }
        if (session.repos) await session.repos.singletons.saveProfile(profile);
        const before = editor.getHTML();
        abort.current = new AbortController();
        setStreaming(true);
        setNotice(null);
        setSetupOpen(false);
        editor.setEditable(false);
        let text = '';
        let frame = 0;
        try {
            const result = await streamDraft(
                payload.incidents?.length
                    ? payload
                    : { ...payload, incidents: [{ id: 'none', title: 'No incidents selected' }] },
                (chunk) => {
                    text += chunk;
                    cancelAnimationFrame(frame);
                    frame = requestAnimationFrame(() =>
                        editor.commands.setContent(textToHtml(text), { emitUpdate: false }),
                    );
                },
                abort.current.signal,
            );
            cancelAnimationFrame(frame);
            if (result === 'refused') {
                editor.commands.setContent(before, { emitUpdate: false });
                setNotice(
                    'This one could not be drafted automatically. You can write it here yourself, or change the wording of your extra context and try again.',
                );
            } else {
                editor.commands.setContent(textToHtml(text), { emitUpdate: false });
                editor.setEditable(true);
                await persist(editor.getHTML());
            }
        } catch (error) {
            cancelAnimationFrame(frame);
            if ((error as Error).name === 'AbortError') {
                if (text) await persist(editor.getHTML());
            } else {
                editor.commands.setContent(before, { emitUpdate: false });
                toast({
                    title: 'Draft not made',
                    description: error instanceof DraftError ? error.message : 'Please try again.',
                    tone: 'warning',
                });
            }
        } finally {
            editor.setEditable(true);
            setStreaming(false);
        }
    };

    const words = payloadText.split(/\s+/).length;

    return (
        <div className="pt-2">
            <NavLink
                href="/documents"
                className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
            >
                <ArrowLeft className="size-4" aria-hidden /> Documents
            </NavLink>
            <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
                <aside className="card h-fit p-5" aria-label="Draft settings">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        aria-expanded={setupOpen}
                        onClick={() => setSetupOpen(!setupOpen)}
                    >
                        <span>
                            <span className="eyebrow">Drafting</span>
                            <span className="block font-display text-lg font-semibold text-fg">
                                {documentTypeInfo[type].title}
                            </span>
                        </span>
                        <ChevronDown
                            className={cn(
                                'size-4 text-fg-subtle transition-transform lg:hidden',
                                setupOpen && 'rotate-180',
                            )}
                            aria-hidden
                        />
                    </button>
                    <div className={cn('mt-4 space-y-5', !setupOpen && 'hidden lg:block')}>
                        <fieldset className="space-y-3">
                            <legend className="mb-2 text-sm font-medium text-fg">Your details</legend>
                            <Field label="Your name">
                                <Input
                                    value={profile.fullName}
                                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Job title">
                                    <Input
                                        value={profile.jobTitle}
                                        onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                                    />
                                </Field>
                                <Field label="Employer">
                                    <Input
                                        value={profile.employer}
                                        onChange={(e) => setProfile({ ...profile, employer: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <Field label="Addressed to" hint="e.g. the HR contact's name or “HR team”">
                                <Input
                                    value={profile.hrContact}
                                    onChange={(e) => setProfile({ ...profile, hrContact: e.target.value })}
                                />
                            </Field>
                        </fieldset>

                        <fieldset>
                            <legend className="mb-2 text-sm font-medium text-fg">
                                Incidents to include ({selected.length})
                            </legend>
                            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                                {incidents.map((i) => (
                                    <li key={i.id}>
                                        <label className="flex cursor-pointer items-start gap-2 rounded-(--radius-md) p-1.5 text-sm hover:bg-raised">
                                            <input
                                                type="checkbox"
                                                className="mt-1 size-4 accent-[var(--accent)]"
                                                checked={selected.includes(i.id)}
                                                onChange={(e) =>
                                                    setSelected(
                                                        e.target.checked
                                                            ? [...selected, i.id]
                                                            : selected.filter((x) => x !== i.id),
                                                    )
                                                }
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-fg">{i.content.title}</span>
                                                <span className="flex items-center gap-2 text-xs text-fg-subtle">
                                                    <span className="mono">{i.incId}</span>
                                                    <SeverityPill severity={i.content.severity} />
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </fieldset>

                        <ChipGroup
                            label="What to share from each"
                            options={fieldOptions.map((f) => ({ value: f.id, label: f.label }))}
                            value={fields}
                            onChange={(v) => setFields(v as FieldId[])}
                        />

                        <div>
                            <p className="mb-2 text-sm font-medium text-fg">Tone</p>
                            <SegmentedControl
                                label="Tone"
                                value={tone}
                                onValueChange={setTone}
                                options={tones}
                                className="w-full"
                            />
                        </div>
                        {(type === 'hr-complaint' || type === 'follow-up-email') && (
                            <Field label="What you are asking for">
                                <Select
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value as DraftDocument['outcome'])}
                                >
                                    {Object.entries(outcomes).map(([v, l]) => (
                                        <option key={v} value={v}>
                                            {l}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        )}
                        <Field
                            label="Anything else to include (optional)"
                            hint={type === 'follow-up-email' ? 'What was said and agreed in the meeting.' : undefined}
                        >
                            <Textarea
                                rows={3}
                                value={context}
                                maxLength={2000}
                                onChange={(e) => setContext(e.target.value)}
                            />
                        </Field>

                        <details className="rounded-(--radius-md) border border-hairline p-3 text-sm">
                            <summary className="cursor-pointer font-medium text-fg">What will be sent</summary>
                            <p className="mt-2 text-xs text-fg-muted">
                                Only this text goes to the drafting service (Anthropic's Claude), through Resolvr's
                                server, to write the draft. It is not stored there or used for training. Files never
                                leave your device. About {words} words.
                            </p>
                            <pre className="mono mt-2 max-h-64 overflow-auto rounded-(--radius-sm) bg-raised p-2 text-2xs whitespace-pre-wrap text-fg-muted">
                                {payloadText}
                            </pre>
                        </details>

                        {streaming ? (
                            <Button className="w-full" onClick={() => abort.current?.abort()}>
                                <Square aria-hidden /> Stop
                            </Button>
                        ) : (
                            <Button variant="primary" className="w-full" onClick={() => void generate()}>
                                <Sparkles aria-hidden /> {editor?.isEmpty === false ? 'Redraft' : 'Draft it'}
                            </Button>
                        )}
                        <p className="text-xs text-fg-subtle">
                            You review and edit every word. Drafts are not legal advice.
                        </p>
                    </div>
                </aside>

                <section className="card flex min-h-[60vh] flex-col overflow-hidden p-0" aria-label="Document">
                    <Toolbar
                        editor={editor}
                        doc={doc}
                        disabled={streaming}
                        type={type}
                        tone={tone}
                        jurisdiction={jurisdiction}
                        onDelete={async () => {
                            if (doc && session.repos) {
                                await session.repos.documents.remove(doc.id);
                                session.refresh();
                            }
                        }}
                    />
                    {notice && (
                        <p className="m-4 rounded-(--radius-md) bg-info-tint p-3 text-sm text-fg" role="status">
                            {notice}
                        </p>
                    )}
                    <div className="doc-editor relative flex-1 px-5 py-4 md:px-10 md:py-8" aria-busy={streaming}>
                        {streaming && editor?.isEmpty && (
                            <p
                                className="absolute inset-x-10 top-8 flex items-center gap-2 text-sm text-fg-muted"
                                role="status"
                            >
                                <Sparkles
                                    className="size-4 animate-pulse text-accent-text motion-reduce:animate-none"
                                    aria-hidden
                                />{' '}
                                Drafting from your record…
                            </p>
                        )}
                        {!streaming && editor?.isEmpty && (
                            <p className="pointer-events-none absolute inset-x-10 top-8 text-sm text-fg-subtle">
                                Choose what to include, then select “Draft it”. You can also just start typing.
                            </p>
                        )}
                        <EditorContent editor={editor} />
                    </div>
                </section>
            </div>
        </div>
    );
}

function Toolbar({
    editor,
    doc,
    disabled,
    type,
    tone,
    jurisdiction,
    onDelete,
}: {
    editor: Editor | null;
    doc: DraftDocument | null;
    disabled: boolean;
    type: DocumentType;
    tone: string;
    jurisdiction: string;
    onDelete: () => Promise<void>;
}) {
    const toast = useToast();
    const navigate = useNavigate();
    const [rewriting, setRewriting] = useState<{
        from: number;
        to: number;
        original: string;
        text: string;
        busy: boolean;
    } | null>(null);

    const rewrite = async (instruction: string) => {
        if (!editor) return;
        // Prefer the browser's selection: the editor's own can lag a moment behind a click.
        const dom = window.getSelection();
        let pos = editor.state.selection.from;
        if (dom?.anchorNode && editor.view.dom.contains(dom.anchorNode)) {
            try {
                pos = editor.view.posAtDOM(dom.anchorNode, dom.anchorOffset);
            } catch {
                // Fall back to the editor's selection.
            }
        }
        const $from = editor.state.doc.resolve(pos);
        if ($from.depth < 1) return;
        const from = $from.before(1);
        const to = $from.after(1);
        const original = editor.state.doc.textBetween(from, to, '\n', '\n').trim();
        if (!original) {
            toast({ title: 'Put the cursor in the paragraph you want to rewrite', tone: 'info' });
            return;
        }
        setRewriting({ from, to, original, text: '', busy: true });
        let text = '';
        try {
            const result = await streamDraft(
                {
                    mode: 'rewrite',
                    type,
                    tone,
                    jurisdiction,
                    paragraph: original,
                    instruction,
                    surrounding: htmlToText(editor.getHTML()).slice(0, 12000),
                },
                (chunk) => {
                    text += chunk;
                    setRewriting((r) => r && { ...r, text });
                },
            );
            if (result === 'refused') {
                setRewriting(null);
                toast({ title: 'That paragraph could not be rewritten automatically', tone: 'info' });
            } else setRewriting((r) => r && { ...r, busy: false });
        } catch (error) {
            setRewriting(null);
            toast({
                title: 'Rewrite not made',
                description: error instanceof DraftError ? error.message : undefined,
                tone: 'warning',
            });
        }
    };

    const exportPdf = async () => {
        if (!doc || !editor) return;
        const [{ downloadPdf, safeFilename }, { LetterPdf }] = await Promise.all([
            import('../../pdf/download'),
            import('../../pdf/LetterPdf'),
        ]);
        await downloadPdf(
            () => <LetterPdf doc={{ ...doc, html: editor.getHTML() }} blocks={htmlToBlocks(editor.getHTML())} />,
            `${safeFilename(doc.title)}.pdf`,
        );
    };
    const exportDocx = async () => {
        if (!doc || !editor) return;
        const [{ saveBlob, safeFilename }] = await Promise.all([import('../../pdf/download')]);
        saveBlob(await toDocx({ ...doc, html: editor.getHTML() }), `${safeFilename(doc.title)}.docx`);
    };

    const btn = (label: string, icon: React.ReactNode, onClick: () => void, active?: boolean) => (
        <button
            type="button"
            className={cn('btn', active && 'bg-accent-tint')}
            data-variant="ghost"
            data-size="icon"
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            disabled={disabled || !editor}
        >
            {icon}
        </button>
    );

    return (
        <div className="border-b border-hairline">
            <div className="flex flex-wrap items-center gap-1 px-3 py-2">
                {btn(
                    'Bold',
                    <Bold aria-hidden />,
                    () => editor?.chain().focus().toggleBold().run(),
                    editor?.isActive('bold'),
                )}
                {btn(
                    'Italic',
                    <Italic aria-hidden />,
                    () => editor?.chain().focus().toggleItalic().run(),
                    editor?.isActive('italic'),
                )}
                {btn(
                    'Bulleted list',
                    <List aria-hidden />,
                    () => editor?.chain().focus().toggleBulletList().run(),
                    editor?.isActive('bulletList'),
                )}
                <span className="mx-1 h-6 w-px bg-hairline" aria-hidden />
                <label className="sr-only" htmlFor="rewrite-how">
                    Rewrite the paragraph at the cursor
                </label>
                <div className="relative">
                    <WandSparkles
                        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle"
                        aria-hidden
                    />
                    <Select
                        id="rewrite-how"
                        className="h-9 w-auto pl-8 text-sm"
                        value=""
                        disabled={disabled || !editor || Boolean(rewriting?.busy)}
                        onChange={(e) => e.target.value && void rewrite(e.target.value)}
                    >
                        <option value="">Rewrite paragraph…</option>
                        {rewrites.map((r) => (
                            <option key={r}>{r}</option>
                        ))}
                    </Select>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    {btn('Copy text', <Copy aria-hidden />, () => {
                        if (!editor) return;
                        void navigator.clipboard
                            .writeText(htmlToText(editor.getHTML()))
                            .then(() => toast({ title: 'Copied', tone: 'success' }));
                    })}
                    <Button size="sm" variant="ghost" onClick={() => void exportPdf()} disabled={disabled || !doc}>
                        <FileDown aria-hidden /> PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void exportDocx()} disabled={disabled || !doc}>
                        <FileType2 aria-hidden /> Word
                    </Button>
                    {doc &&
                        btn(
                            'Delete draft',
                            <Trash2 aria-hidden />,
                            () => void onDelete().then(() => navigate('/documents')),
                        )}
                </div>
            </div>
            {rewriting && (
                <div
                    className="border-t border-hairline bg-raised px-4 py-3 text-sm"
                    role="region"
                    aria-label="Rewritten paragraph"
                >
                    <p className="eyebrow">Suggested rewrite</p>
                    <p className="mt-1 whitespace-pre-wrap text-fg">{rewriting.text || '…'}</p>
                    <div className="mt-2 flex gap-2">
                        <Button
                            size="sm"
                            variant="primary"
                            disabled={rewriting.busy || !rewriting.text}
                            onClick={() => {
                                editor
                                    ?.chain()
                                    .focus()
                                    .insertContentAt(
                                        { from: rewriting.from, to: rewriting.to },
                                        textToHtml(rewriting.text),
                                    )
                                    .run();
                                setRewriting(null);
                            }}
                        >
                            <RefreshCw aria-hidden /> Use this
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRewriting(null)}>
                            Keep mine
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
