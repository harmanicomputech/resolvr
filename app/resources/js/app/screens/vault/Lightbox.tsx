import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    FileAudio,
    FileText,
    Fingerprint,
    Link2,
    Minus,
    Plus,
    ScanText,
    SquareDashedMousePointer,
    Trash2,
    X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { linkFiles } from '@/lib/db';
import type { EvidenceFile, Incident } from '@/lib/model/schema';

import { formatBytes } from '../../components/attachment-list';
import { PinConfirm } from '../../components/pin-confirm';
import { useToast } from '../../components/toaster';
import { useFileUrl } from '../../hooks/use-file-url';
import { ingestFiles } from '../../lib/ingest';
import { saveBlob } from '../../pdf/download';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';
import { Redactor } from './Redactor';

const dt = (iso?: string) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '–';

interface LightboxProps {
    files: EvidenceFile[];
    index: number;
    incidents: Incident[];
    folders: string[];
    onIndex: (index: number) => void;
    onClose: () => void;
}

/** Full-screen viewer with zoom, swipe, details, linking, OCR and redaction. */
export function Lightbox({ files, index, incidents, folders, onIndex, onClose }: LightboxProps) {
    const file = files[index];
    const open = Boolean(file);
    const go = (delta: number) => files.length && onIndex((index + delta + files.length) % files.length);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLSelectElement ||
                e.target instanceof HTMLTextAreaElement
            )
                return;
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-inverse/90 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className="fixed inset-0 z-50 flex flex-col outline-none md:flex-row"
                    aria-describedby={undefined}
                >
                    {file && (
                        <Viewer
                            key={file.id}
                            file={file}
                            count={files.length}
                            position={index}
                            onPrev={() => go(-1)}
                            onNext={() => go(1)}
                        />
                    )}
                    {file && (
                        <Details
                            key={`d-${file.id}`}
                            file={file}
                            incidents={incidents}
                            folders={folders}
                            onClose={onClose}
                        />
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function Viewer({
    file,
    count,
    position,
    onPrev,
    onNext,
}: {
    file: EvidenceFile;
    count: number;
    position: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    const url = useFileUrl(file.id);
    const reduce = useReducedMotion();
    const [scale, setScale] = useState(1);
    const image = file.mimeType.startsWith('image/');
    const zoom = (next: number) => setScale(Math.min(4, Math.max(1, next)));

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            <DialogPrimitive.Title className="sr-only">{file.name}</DialogPrimitive.Title>
            <div
                className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
                onWheel={(e) => image && zoom(scale - e.deltaY * 0.002)}
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={file.id}
                        className="flex size-full items-center justify-center"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        drag={scale === 1 && count > 1 ? 'x' : false}
                        dragSnapToOrigin
                        onDragEnd={(_, info) =>
                            info.offset.x < -80 ? onNext() : info.offset.x > 80 ? onPrev() : undefined
                        }
                    >
                        {image && url ? (
                            <motion.img
                                src={url}
                                alt={file.name}
                                className="max-h-full max-w-full rounded-(--radius-md) object-contain select-none"
                                animate={{ scale }}
                                drag={scale > 1}
                                dragMomentum={false}
                                onDoubleClick={() => setScale(scale > 1 ? 1 : 2.5)}
                                draggable={false}
                            />
                        ) : image ? (
                            file.thumb && (
                                <img src={file.thumb} alt="" className="max-h-full max-w-full scale-100 blur-xl" />
                            )
                        ) : file.mimeType.startsWith('audio/') ? (
                            <div className="flex flex-col items-center gap-4 text-fg-inverse">
                                <FileAudio className="size-16 opacity-80" aria-hidden />
                                {url && <audio src={url} controls className="w-72" />}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-fg-inverse">
                                <FileText className="size-16 opacity-80" aria-hidden />
                                {url && (
                                    <Button onClick={() => window.open(url, '_blank', 'noopener')}>
                                        <ExternalLink aria-hidden /> Open PDF
                                    </Button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="flex items-center justify-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-fg-inverse md:pb-4">
                {count > 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-fg-inverse"
                        onClick={onPrev}
                        aria-label="Previous file"
                    >
                        <ChevronLeft aria-hidden />
                    </Button>
                )}
                {image && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-fg-inverse"
                            onClick={() => zoom(scale - 0.5)}
                            aria-label="Zoom out"
                            disabled={scale <= 1}
                        >
                            <Minus aria-hidden />
                        </Button>
                        <span className="w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-fg-inverse"
                            onClick={() => zoom(scale + 0.5)}
                            aria-label="Zoom in"
                            disabled={scale >= 4}
                        >
                            <Plus aria-hidden />
                        </Button>
                    </>
                )}
                {count > 1 && (
                    <>
                        <span className="text-xs opacity-70">
                            {position + 1} / {count}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-fg-inverse"
                            onClick={onNext}
                            aria-label="Next file"
                        >
                            <ChevronRight aria-hidden />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

function Details({
    file,
    incidents,
    folders,
    onClose,
}: {
    file: EvidenceFile;
    incidents: Incident[];
    folders: string[];
    onClose: () => void;
}) {
    const session = useSession();
    const toast = useToast();
    const url = useFileUrl(file.mimeType.startsWith('image/') ? file.id : undefined);
    const [verify, setVerify] = useState<'idle' | 'ok' | 'bad'>('idle');
    const [ocr, setOcr] = useState<number | null>(null);
    const [newFolder, setNewFolder] = useState<string | null>(null);
    const [redacting, setRedacting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const repos = session.repos!;
    const linked = incidents.filter((i) => file.incidentIds.includes(i.id));
    const unlinked = incidents.filter((i) => !file.incidentIds.includes(i.id));

    const save = async (patch: Partial<EvidenceFile>) => {
        await repos.files.update({ ...file, ...patch });
        session.refresh();
    };

    const link = async (incidentId: string) => {
        const incident = incidents.find((i) => i.id === incidentId);
        if (!incident) return;
        const attachmentIds = [...incident.content.attachmentIds, file.id];
        await repos.incidents.update(incident.id, { ...incident.content, attachmentIds });
        await linkFiles(repos.files, incident.id, attachmentIds, incident.content.attachmentIds);
        session.refresh();
        toast({
            title: `Linked to ${incident.incId}`,
            description: 'Added to the incident as a new version.',
            tone: 'success',
        });
    };

    const runOcr = async () => {
        setOcr(0);
        try {
            const [{ readText }, blob] = await Promise.all([import('@/lib/files/ocr'), repos.files.open(file.id)]);
            if (!blob) return;
            const text = await readText(blob, setOcr);
            await save({ ocrText: text });
            toast({
                title: text ? 'Text found and made searchable' : 'No text found in this image',
                tone: text ? 'success' : 'info',
            });
        } catch {
            toast({ title: 'Could not read text from this image', tone: 'warning' });
        } finally {
            setOcr(null);
        }
    };

    return (
        <aside
            className="flex max-h-[45dvh] w-full flex-col overflow-y-auto bg-surface md:max-h-none md:w-96"
            aria-label="File details"
        >
            <div className="flex items-start gap-2 border-b border-hairline p-4">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{file.name}</p>
                    <p className="text-xs text-fg-subtle">
                        {formatBytes(file.size)}
                        {file.width && file.height ? ` · ${file.width}×${file.height}` : ''}
                    </p>
                </div>
                <DialogPrimitive.Close className="btn" data-variant="ghost" data-size="icon" aria-label="Close">
                    <X aria-hidden />
                </DialogPrimitive.Close>
            </div>
            <div className="space-y-5 p-4 text-sm">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <dt className="text-fg-subtle">Added</dt>
                    <dd className="text-fg">{dt(file.addedAt)}</dd>
                    <dt className="text-fg-subtle">{file.mimeType === 'image/jpeg' ? 'Taken' : 'File date'}</dt>
                    <dd className="text-fg">{dt(file.capturedAt)}</dd>
                </dl>

                <div>
                    <p className="eyebrow mb-1">Fingerprint (SHA-256)</p>
                    <p className="mono text-2xs break-all text-fg-muted">{file.sha256}</p>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 -ml-2"
                        onClick={async () => {
                            setVerify((await repos.files.verify(file.id)) ? 'ok' : 'bad');
                        }}
                    >
                        <Fingerprint aria-hidden /> Check it has not changed
                    </Button>
                    {verify !== 'idle' && (
                        <p className={verify === 'ok' ? 'text-success-text' : 'text-danger-text'} role="status">
                            {verify === 'ok'
                                ? 'Matches the fingerprint taken when it was added.'
                                : 'Does not match. This file may have been altered.'}
                        </p>
                    )}
                </div>

                <div>
                    <p className="eyebrow mb-1">Linked incidents</p>
                    {linked.length ? (
                        <ul className="space-y-1">
                            {linked.map((i) => (
                                <li key={i.id}>
                                    <NavLink
                                        href={`/incidents/${i.id}`}
                                        onClick={onClose}
                                        className="text-accent-text hover:underline"
                                    >
                                        <span className="mono text-xs">{i.incId}</span> {i.content.title}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-fg-subtle">Not linked to an incident yet.</p>
                    )}
                    {unlinked.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                            <Link2 className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                            <label htmlFor="link-incident" className="sr-only">
                                Link to an incident
                            </label>
                            <Select
                                id="link-incident"
                                value=""
                                onChange={(e) => e.target.value && void link(e.target.value)}
                            >
                                <option value="">Link to an incident…</option>
                                {unlinked.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.incId} {i.content.title}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>

                {newFolder === null ? (
                    <Field label="Folder">
                        <Select
                            value={file.folder ?? ''}
                            onChange={(e) =>
                                e.target.value === '__new'
                                    ? setNewFolder('')
                                    : void save({ folder: e.target.value || undefined })
                            }
                        >
                            <option value="">No folder</option>
                            {folders.map((f) => (
                                <option key={f}>{f}</option>
                            ))}
                            <option value="__new">New folder…</option>
                        </Select>
                    </Field>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (newFolder.trim()) void save({ folder: newFolder.trim() });
                            setNewFolder(null);
                        }}
                        className="flex items-end gap-2"
                    >
                        <Field label="New folder" className="flex-1">
                            <Input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
                        </Field>
                        <Button type="submit" size="sm">
                            Save
                        </Button>
                    </form>
                )}

                {file.mimeType.startsWith('image/') && (
                    <div>
                        <p className="eyebrow mb-1">Text in this image</p>
                        {file.ocrText ? (
                            <p className="max-h-32 overflow-y-auto text-xs whitespace-pre-wrap text-fg-muted">
                                {file.ocrText}
                            </p>
                        ) : (
                            <p className="text-fg-subtle">Read the text on this device so you can search for it.</p>
                        )}
                        <Button size="sm" className="mt-2" onClick={() => void runOcr()} disabled={ocr !== null}>
                            <ScanText aria-hidden />{' '}
                            {ocr !== null
                                ? `Reading… ${Math.round(ocr * 100)}%`
                                : file.ocrText
                                  ? 'Read again'
                                  : 'Make text searchable'}
                        </Button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
                    <Button
                        size="sm"
                        onClick={async () => await repos.files.open(file.id).then((b) => b && saveBlob(b, file.name))}
                    >
                        <Download aria-hidden /> Download
                    </Button>
                    {file.mimeType.startsWith('image/') && (
                        <Button size="sm" onClick={() => setRedacting(true)} disabled={!url}>
                            <SquareDashedMousePointer aria-hidden /> Redact a copy
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                            file.incidentIds.length
                                ? toast({
                                      title: 'Unlink it first',
                                      description:
                                          'This file is evidence for an incident. Remove it from the incident before deleting it.',
                                      tone: 'info',
                                  })
                                : setDeleting(true)
                        }
                    >
                        <Trash2 aria-hidden /> Delete
                    </Button>
                </div>
                <p className="text-xs text-fg-subtle">
                    Downloaded copies are not encrypted. Keep them somewhere private.
                </p>
            </div>

            <Redactor
                src={url}
                open={redacting}
                onOpenChange={setRedacting}
                onSave={async (blob) => {
                    const base = file.name.replace(/\.[^.]+$/, '');
                    await ingestFiles([new File([blob], `${base} (redacted).png`, { type: 'image/png' })], repos, {
                        folder: file.folder,
                    });
                    session.refresh();
                    toast({ title: 'Redacted copy saved', description: 'The original is unchanged.', tone: 'success' });
                }}
            />
            <PinConfirm
                open={deleting}
                onOpenChange={setDeleting}
                title={`Delete ${file.name}?`}
                description="This permanently removes the file from this device."
                confirmLabel="Delete file"
                onConfirm={async () => {
                    await repos.files.purge(file.id);
                    session.refresh();
                    onClose();
                    toast({ title: 'File deleted' });
                }}
            />
        </aside>
    );
}
