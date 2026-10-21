import { Camera, FolderLock, Paperclip } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { EvidenceFile } from '@/lib/model/schema';

import { AttachmentList, FileThumb } from '../../components/attachment-list';
import { Recorder } from '../../components/recorder';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useSession } from '../../session';
import { StepEvidenceChips, type StepProps } from './steps';

export const ACCEPT = 'image/*,application/pdf,audio/*';
const MAX_BYTES = 50 * 1024 * 1024;

/** Add files to the vault and return their ids. Over-size files are skipped with a note. */
export function useAddFiles() {
    const { repos } = useSession();
    const toast = useToast();
    return async (files: Iterable<File>): Promise<string[]> => {
        if (!repos) return [];
        const ids: string[] = [];
        for (const file of files) {
            if (file.size > MAX_BYTES) {
                toast({
                    title: `${file.name} is too large`,
                    description: 'Files up to 50 MB can be stored.',
                    tone: 'warning',
                });
                continue;
            }
            ids.push(
                (
                    await repos.files.add(
                        file,
                        file.lastModified ? { capturedAt: new Date(file.lastModified).toISOString() } : {},
                    )
                ).id,
            );
        }
        return ids;
    };
}

export function StepEvidence(props: StepProps) {
    const { form, update } = props;
    const addFiles = useAddFiles();
    const fileInput = useRef<HTMLInputElement>(null);
    const cameraInput = useRef<HTMLInputElement>(null);
    const [picking, setPicking] = useState(false);
    const [busy, setBusy] = useState(false);
    const { data: allFiles } = useData((repos) => repos.files.list(), [form.fileIds.join()]);
    const attached = (allFiles ?? []).filter((f) => form.fileIds.includes(f.id));

    const add = async (files: FileList | File[] | null) => {
        if (!files?.length) return;
        setBusy(true);
        const ids = await addFiles(Array.from(files));
        setBusy(false);
        update({ fileIds: [...form.fileIds, ...ids] });
    };

    return (
        <div className="space-y-6">
            <StepEvidenceChips {...props} />
            <div>
                <p className="mb-2 text-sm font-medium text-fg">Attach evidence</p>
                <p className="mb-3 text-xs text-fg-muted">
                    Files are encrypted on this device and fingerprinted, so you can show later that they have not
                    changed.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => fileInput.current?.click()} disabled={busy}>
                        <Paperclip aria-hidden /> Choose files
                    </Button>
                    <Button onClick={() => cameraInput.current?.click()} disabled={busy}>
                        <Camera aria-hidden /> Take a photo
                    </Button>
                    <Button onClick={() => setPicking(true)} disabled={busy}>
                        <FolderLock aria-hidden /> From your vault
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
                    onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))}
                />
                <input
                    ref={cameraInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(e) => void add(e.target.files).then(() => (e.target.value = ''))}
                />
                <div className="mt-4">
                    <Recorder onRecorded={(file) => void add([file])} />
                </div>
                {busy && (
                    <p className="mt-3 text-sm text-fg-muted" role="status">
                        Encrypting…
                    </p>
                )}
                <div className="mt-4">
                    <AttachmentList
                        files={attached}
                        onRemove={(id) => update({ fileIds: form.fileIds.filter((f) => f !== id) })}
                    />
                </div>
            </div>

            <VaultPicker
                open={picking}
                onOpenChange={setPicking}
                files={(allFiles ?? []).filter((f) => !form.fileIds.includes(f.id))}
                onPick={(id) => update({ fileIds: [...form.fileIds, id] })}
            />
        </div>
    );
}

function VaultPicker({
    open,
    onOpenChange,
    files,
    onPick,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    files: EvidenceFile[];
    onPick: (id: string) => void;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" title="Choose from your vault" className="mx-auto max-w-xl">
                {files.length ? (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {files.map((f) => (
                            <li key={f.id}>
                                <button
                                    type="button"
                                    className="flex w-full flex-col items-center gap-1 rounded-(--radius-md) p-2 text-xs text-fg-muted hover:bg-raised focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                                    onClick={() => {
                                        onPick(f.id);
                                        onOpenChange(false);
                                    }}
                                >
                                    <FileThumb file={f} className="size-20" />
                                    <span className="w-full truncate">{f.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-fg-muted">Nothing else in your vault yet.</p>
                )}
            </SheetContent>
        </Sheet>
    );
}
