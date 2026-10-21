import { Camera, Check, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { useSearch } from 'wouter';

import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';

import { AttachmentList } from '../../components/attachment-list';
import { Recorder } from '../../components/recorder';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useNavigate } from '../../hooks/use-navigate';
import { haptic } from '../../lib/haptics';
import { useSession } from '../../session';
import { useAddFiles } from './StepEvidence';

/**
 * Quick capture: a title and a voice note or photo in about ten seconds,
 * kept as an encrypted draft to finish later from the Log.
 */
export default function Capture() {
    const mode = new URLSearchParams(useSearch()).get('mode');
    const session = useSession();
    const navigate = useNavigate();
    const toast = useToast();
    const addFiles = useAddFiles();
    const camera = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [fileIds, setFileIds] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const { data: files } = useData((repos) => repos.files.list(), [fileIds.join()]);

    const attach = async (list: File[]) => {
        setBusy(true);
        const ids = await addFiles(list);
        setFileIds((current) => [...current, ...ids]);
        setBusy(false);
    };

    const save = async () => {
        if (!session.repos) return;
        const draft = session.repos.drafts.create({ quick: true });
        draft.form.title =
            title.trim() ||
            `Quick capture, ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
        draft.form.description = note;
        draft.form.fileIds = fileIds;
        await session.repos.drafts.save(draft);
        haptic('success');
        toast({ title: 'Captured', description: 'Finish it from your Log when you are ready.', tone: 'success' });
        session.refresh();
        navigate('/incidents');
    };

    return (
        <div className="mx-auto max-w-lg py-4">
            <div className="flex items-center gap-3">
                <span className="icon-badge" data-size="lg" aria-hidden>
                    <Zap className="size-6" />
                </span>
                <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">Quick capture</h2>
                    <p className="text-sm text-fg-muted">Get it down now. Finish the details later.</p>
                </div>
            </div>
            <div className="mt-6 space-y-5">
                <Field label="What is this about?">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Comment in the 3pm meeting"
                        autoFocus={mode !== 'voice'}
                    />
                </Field>
                <div className="card space-y-4 p-4">
                    <Recorder onRecorded={(file) => void attach([file])} autoStart={mode === 'voice'} />
                    <div>
                        <Button onClick={() => camera.current?.click()} disabled={busy}>
                            <Camera aria-hidden /> Snap a photo
                        </Button>
                        <input
                            ref={camera}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            tabIndex={-1}
                            aria-hidden
                            onChange={(e) =>
                                e.target.files &&
                                void attach(Array.from(e.target.files)).then(() => (e.target.value = ''))
                            }
                        />
                    </div>
                    <AttachmentList
                        files={(files ?? []).filter((f) => fileIds.includes(f.id))}
                        onRemove={(id) => setFileIds(fileIds.filter((f) => f !== id))}
                    />
                </div>
                <Field label="A quick note (optional)">
                    <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => void save()}
                    disabled={busy || (!title.trim() && !note.trim() && !fileIds.length)}
                >
                    <Check aria-hidden /> Save for later
                </Button>
                <p className="text-center text-xs text-fg-subtle">
                    Saved encrypted on this device as a draft. It joins your locked record when you finish it.
                </p>
            </div>
        </div>
    );
}
