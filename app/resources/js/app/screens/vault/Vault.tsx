import { Camera, FileAudio, FileText, Folder, FolderLock, Link2, Search, Upload } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useSearch } from 'wouter';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import type { EvidenceFile } from '@/lib/model/schema';
import { cn } from '@/lib/utils';

import { formatBytes } from '../../components/attachment-list';
import { BlurImage } from '../../components/blur-image';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { haptic } from '../../lib/haptics';
import { importSharedFiles, ingestFiles, type IngestStatus } from '../../lib/ingest';
import { useSession } from '../../session';
import { Lightbox } from './Lightbox';

type Kind = 'all' | 'images' | 'pdfs' | 'audio' | 'linked' | 'unlinked';
const kinds: { id: Kind; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'images', label: 'Images' },
    { id: 'pdfs', label: 'PDFs' },
    { id: 'audio', label: 'Audio' },
    { id: 'linked', label: 'Linked' },
    { id: 'unlinked', label: 'Not linked' },
];

const matchesKind = (f: EvidenceFile, kind: Kind) =>
    kind === 'all' ||
    (kind === 'images' && f.mimeType.startsWith('image/')) ||
    (kind === 'pdfs' && f.mimeType === 'application/pdf') ||
    (kind === 'audio' && f.mimeType.startsWith('audio/')) ||
    (kind === 'linked' && f.incidentIds.length > 0) ||
    (kind === 'unlinked' && f.incidentIds.length === 0);

/** The evidence vault: everything encrypted on this device, fingerprinted on the way in. */
export default function Vault() {
    const session = useSession();
    const toast = useToast();
    const reduce = useReducedMotion();
    const params = new URLSearchParams(useSearch());
    const fileInput = useRef<HTMLInputElement>(null);
    const camera = useRef<HTMLInputElement>(null);
    const [kind, setKind] = useState<Kind>('all');
    const [folder, setFolder] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [dragging, setDragging] = useState(false);
    const [queue, setQueue] = useState<IngestStatus[]>([]);
    const [open, setOpen] = useState<string | null>(null);
    const { data, loading } = useData(async (repos) => {
        const [files, incidents] = await Promise.all([repos.files.list(), repos.incidents.list()]);
        return { files, incidents };
    });

    const upload = async (list: File[]) => {
        if (!session.repos || !list.length) return;
        const added = await ingestFiles(list, session.repos, { folder: folder ?? undefined, onStatus: setQueue });
        haptic('success');
        session.refresh();
        if (added.length)
            toast({
                title: `${added.length} ${added.length === 1 ? 'file' : 'files'} encrypted and saved`,
                tone: 'success',
            });
        window.setTimeout(() => setQueue([]), 2500);
    };

    // Open the picker straight away when arriving from "Upload" quick actions.
    useEffect(() => {
        if (params.get('upload') === '1') fileInput.current?.click();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Files shared from another app wait until unlock; bring them in now.
    useEffect(() => {
        if (!session.repos) return;
        void importSharedFiles(session.repos).then((added) => {
            if (!added.length) return;
            session.refresh();
            toast({
                title: `${added.length} shared ${added.length === 1 ? 'file' : 'files'} saved`,
                description: 'They are in the “Shared” folder.',
                tone: 'success',
            });
        });
        if (params.get('shared') === 'unavailable')
            toast({
                title: 'Sharing needs the installed app',
                description: 'Open Resolvr once, then try sharing again.',
                tone: 'info',
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session.repos]);

    // Drag-and-drop anywhere on the page, and paste screenshots.
    useEffect(() => {
        let depth = 0;
        const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
        const enter = (e: DragEvent) => hasFiles(e) && (depth++, setDragging(true));
        const leave = (e: DragEvent) => hasFiles(e) && --depth <= 0 && ((depth = 0), setDragging(false));
        const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
        const drop = (e: DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth = 0;
            setDragging(false);
            void upload(Array.from(e.dataTransfer?.files ?? []));
        };
        const paste = (e: ClipboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const files = Array.from(e.clipboardData?.files ?? []);
            if (files.length) {
                e.preventDefault();
                void upload(
                    files.map((f, i) =>
                        f.name && f.name !== 'image.png'
                            ? f
                            : new File(
                                  [f],
                                  `pasted-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}${i ? `-${i}` : ''}.png`,
                                  { type: f.type },
                              ),
                    ),
                );
            }
        };
        window.addEventListener('dragenter', enter);
        window.addEventListener('dragleave', leave);
        window.addEventListener('dragover', over);
        window.addEventListener('drop', drop);
        window.addEventListener('paste', paste);
        return () => {
            window.removeEventListener('dragenter', enter);
            window.removeEventListener('dragleave', leave);
            window.removeEventListener('dragover', over);
            window.removeEventListener('drop', drop);
            window.removeEventListener('paste', paste);
        };
    });

    if (loading && !data) return <VaultSkeleton />;
    if (!data) return null;

    const folders = [...new Set(data.files.map((f) => f.folder).filter((f): f is string => Boolean(f)))].sort();
    const q = query.trim().toLowerCase();
    const shown = data.files.filter(
        (f) =>
            matchesKind(f, kind) &&
            (!folder || f.folder === folder) &&
            (!q || `${f.name} ${f.ocrText ?? ''} ${f.folder ?? ''}`.toLowerCase().includes(q)),
    );
    const index = open ? shown.findIndex((f) => f.id === open) : -1;

    return (
        <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-56">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                        aria-hidden
                    />
                    <label htmlFor="vault-search" className="sr-only">
                        Search files
                    </label>
                    <Input
                        id="vault-search"
                        type="search"
                        className="pl-9"
                        placeholder="Search names and text in screenshots"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <Button variant="primary" onClick={() => fileInput.current?.click()}>
                    <Upload aria-hidden /> Upload
                </Button>
                <Button onClick={() => camera.current?.click()} aria-label="Take a photo">
                    <Camera aria-hidden /> <span className="hidden sm:inline">Photo</span>
                </Button>
                <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,audio/*"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    data-testid="vault-upload"
                    onChange={(e) => void upload(Array.from(e.target.files ?? [])).then(() => (e.target.value = ''))}
                />
                <input
                    ref={camera}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(e) => void upload(Array.from(e.target.files ?? [])).then(() => (e.target.value = ''))}
                />
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
                {kinds.map((k) => (
                    <Chip key={k.id} selected={kind === k.id} onSelectedChange={() => setKind(k.id)}>
                        {k.label}
                    </Chip>
                ))}
                {folders.map((f) => (
                    <Chip key={f} selected={folder === f} onSelectedChange={(on) => setFolder(on ? f : null)}>
                        <Folder className="size-3.5" aria-hidden /> {f}
                    </Chip>
                ))}
            </div>

            <AnimatePresence>
                {queue.length > 0 && (
                    <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="card space-y-2 overflow-hidden p-4"
                        aria-live="polite"
                        aria-label="Uploads"
                    >
                        {queue.map((item, i) => (
                            <li key={i} className="text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="truncate text-fg">{item.name}</span>
                                    <span className="shrink-0 text-xs text-fg-muted">
                                        {item.state === 'waiting'
                                            ? 'Waiting'
                                            : item.state === 'encrypting'
                                              ? 'Encrypting…'
                                              : item.state === 'done'
                                                ? 'Saved'
                                                : item.reason}
                                    </span>
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-hairline">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-all duration-(--dur-base)',
                                            item.state === 'done'
                                                ? 'w-full bg-success'
                                                : item.state === 'encrypting'
                                                  ? 'w-2/3 animate-pulse bg-accent motion-reduce:animate-none'
                                                  : item.state === 'skipped'
                                                    ? 'w-full bg-warning'
                                                    : 'w-0',
                                        )}
                                    />
                                </div>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>

            {data.files.length === 0 ? (
                <EmptyState
                    icon={<FolderLock className="size-6" />}
                    title="Your vault is empty"
                    action={
                        <Button variant="primary" onClick={() => fileInput.current?.click()}>
                            Add your first file
                        </Button>
                    }
                >
                    Drop screenshots, photos, PDFs or voice notes here, or paste a screenshot. Each file is encrypted on
                    this device and fingerprinted so you can show it has not changed.
                </EmptyState>
            ) : shown.length === 0 ? (
                <EmptyState icon={<Search className="size-6" />} title="Nothing matches" />
            ) : (
                <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4" aria-label="Files">
                    {shown.map((f, i) => (
                        <motion.li
                            key={f.id}
                            className="mb-3 break-inside-avoid"
                            initial={reduce ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: reduce ? 0 : Math.min(i, 12) * 0.025 }}
                        >
                            <button
                                type="button"
                                className="group card block w-full overflow-hidden p-0 text-left transition-shadow hover:shadow-(--shadow-floating) focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                                onClick={() => setOpen(f.id)}
                            >
                                {f.mimeType.startsWith('image/') ? (
                                    <BlurImage
                                        file={f}
                                        className="w-full transition-transform duration-(--dur-slow) group-hover:scale-[1.02]"
                                    />
                                ) : (
                                    <div className="grid aspect-[4/3] place-items-center bg-raised">
                                        <span className="icon-badge" data-size="lg" data-tone="neutral" aria-hidden>
                                            {f.mimeType.startsWith('audio/') ? (
                                                <FileAudio className="size-6" />
                                            ) : (
                                                <FileText className="size-6" />
                                            )}
                                        </span>
                                    </div>
                                )}
                                <div className="p-3">
                                    <p className="truncate text-sm text-fg">{f.name}</p>
                                    <p className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                                        <span>
                                            {new Date(f.capturedAt ?? f.addedAt).toLocaleDateString(undefined, {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        <span>{formatBytes(f.size)}</span>
                                        {f.incidentIds.length > 0 && (
                                            <span className="ml-auto flex items-center gap-0.5 text-accent-text">
                                                <Link2 className="size-3" aria-hidden />
                                                {f.incidentIds.length}
                                                <span className="sr-only">
                                                    {' '}
                                                    linked {f.incidentIds.length === 1 ? 'incident' : 'incidents'}
                                                </span>
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </button>
                        </motion.li>
                    ))}
                </ul>
            )}

            <AnimatePresence>
                {dragging && (
                    <motion.div
                        className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-accent/10 p-6 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="rounded-(--radius-xl) border-2 border-dashed border-accent bg-surface px-10 py-8 text-center shadow-(--shadow-overlay)">
                            <Upload className="mx-auto size-8 text-accent-text" aria-hidden />
                            <p className="mt-2 font-medium text-fg">Drop to encrypt and save</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Lightbox
                files={shown}
                index={index}
                incidents={data.incidents}
                folders={folders}
                onIndex={(i) => setOpen(shown[i]?.id ?? null)}
                onClose={() => setOpen(null)}
            />
        </div>
    );
}

function VaultSkeleton() {
    return (
        <div
            className="columns-2 gap-3 pt-14 sm:columns-3 lg:columns-4"
            aria-busy="true"
            aria-label="Opening your vault"
        >
            {[180, 240, 140, 200, 260, 160, 220, 190].map((h, i) => (
                <Skeleton key={i} className="mb-3 break-inside-avoid" style={{ height: h }} />
            ))}
        </div>
    );
}
