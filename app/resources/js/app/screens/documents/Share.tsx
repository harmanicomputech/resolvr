import { ArrowLeft, Check, Copy, Eye, Link2, Power } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SeverityPill } from '@/components/ui/severity-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { sealBundle, shareUrl } from '@/lib/share/bundle';
import { buildShareBundle } from '@/lib/share/build';
import { revokeShare, shareStatus, uploadShare, type ShareStatus } from '@/lib/share/client';
import { listShares, saveShare, type ShareRecord } from '@/lib/share/records';

import { MotionItem } from '../../components/motion-item';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { useOnline } from '../../hooks/use-online';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';
import { Toggle } from '../settings/parts';

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Share selected incidents read-only with a lawyer or advisor. The bundle is
 * encrypted here with a random key that lives only in the link's #fragment;
 * the server stores ciphertext, an expiry, and a log of views.
 */
export default function Share() {
    const session = useSession();
    const toast = useToast();
    const online = useOnline();
    const { data, loading } = useData(async (repos) => ({
        incidents: await repos.incidents.list(),
        shares: await listShares(repos),
    }));
    const [picked, setPicked] = useState<Set<string> | null>(null);
    const [includeFiles, setIncludeFiles] = useState(true);
    const [includeName, setIncludeName] = useState(true);
    const [note, setNote] = useState('');
    const [expiresIn, setExpiresIn] = useState<'24h' | '7d'>('7d');
    const [progress, setProgress] = useState<number | null>(null);
    const [made, setMade] = useState<string | null>(null);

    if (loading && !data) return <Skeleton className="mt-4 h-96" />;
    if (!data) return null;
    const chosen = picked ?? new Set(data.incidents.map((i) => i.id));
    const toggle = (id: string) => {
        const next = new Set(chosen);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setPicked(next);
    };

    const create = async () => {
        if (!session.repos) return;
        setProgress(0);
        try {
            const bundle = await buildShareBundle(session.repos, {
                incidentIds: [...chosen],
                includeFiles,
                includeName,
                note,
            });
            const { sealed, key } = await sealBundle(bundle.plain);
            const { id, token, expiresAt } = await uploadShare(new Blob([sealed]), expiresIn, setProgress);
            const label = `${bundle.incidentCount} ${bundle.incidentCount === 1 ? 'incident' : 'incidents'}`;
            const record: ShareRecord = {
                id,
                token,
                key,
                label,
                incidentIds: [...chosen],
                fileCount: bundle.fileCount,
                createdAt: new Date().toISOString(),
                expiresAt,
            };
            await saveShare(session.repos, record);
            session.refresh();
            setMade(shareUrl(location.origin, id, key));
            setNote('');
        } catch (error) {
            toast({
                title: 'No link made',
                description: error instanceof Error ? error.message : 'Please try again.',
                tone: 'warning',
            });
        } finally {
            setProgress(null);
        }
    };

    return (
        <div className="mx-auto w-full max-w-3xl min-w-0 space-y-6 pt-2">
            <NavLink href="/documents" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
                <ArrowLeft className="size-4" aria-hidden /> Documents
            </NavLink>

            <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="share-title">
                <header className="flex items-start gap-3">
                    <span className="icon-badge" aria-hidden>
                        <Link2 className="size-4" />
                    </span>
                    <div>
                        <h2 id="share-title" className="font-display text-lg font-semibold text-fg">
                            Share with a lawyer
                        </h2>
                        <p className="text-sm text-fg-muted">
                            They get a read-only copy of what you choose. It is encrypted on this device, the key is
                            only in the link, and the link stops working when it expires or you turn it off.
                        </p>
                    </div>
                </header>

                <fieldset className="min-w-0">
                    <legend className="sr-only">Incidents to share</legend>
                    <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                        <p className="font-medium text-fg">
                            Incidents <span className="text-fg-muted">({chosen.size} chosen)</span>
                        </p>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPicked(new Set(data.incidents.map((i) => i.id)))}
                            >
                                All
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
                                None
                            </Button>
                        </div>
                    </div>
                    <ul className="max-h-80 divide-y divide-hairline overflow-y-auto rounded-(--radius-md) border border-hairline">
                        {data.incidents.map((i) => (
                            <li key={i.id}>
                                <label className="flex min-w-0 cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-raised">
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-[var(--accent)]"
                                        checked={chosen.has(i.id)}
                                        onChange={() => toggle(i.id)}
                                    />
                                    <span className="mono text-xs text-fg-muted">{i.incId}</span>
                                    <span className="min-w-0 flex-1 truncate text-fg">{i.content.title}</span>
                                    <SeverityPill severity={i.content.severity} />
                                </label>
                            </li>
                        ))}
                    </ul>
                </fieldset>

                <div className="space-y-3">
                    <label className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-fg">Include attached evidence files</span>
                        <Toggle
                            label="Include attached evidence files"
                            checked={includeFiles}
                            onChange={setIncludeFiles}
                        />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-fg">Show my name</span>
                        <Toggle label="Show my name" checked={includeName} onChange={setIncludeName} />
                    </label>
                </div>

                <Field label="Note to the reader (optional)">
                    <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
                </Field>

                <SegmentedControl
                    label="Link works for"
                    value={expiresIn}
                    onValueChange={setExpiresIn}
                    options={[
                        { value: '24h', label: '24 hours' },
                        { value: '7d', label: '7 days' },
                    ]}
                />

                {progress !== null && (
                    <progress
                        className="h-1.5 w-full accent-[var(--accent)]"
                        value={progress}
                        max={1}
                        aria-label="Encrypting and uploading"
                    />
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-fg-subtle">
                        Views are logged so you can see when the link is used. Not legal advice.
                    </p>
                    <Button
                        variant="primary"
                        disabled={!chosen.size || progress !== null || !online}
                        onClick={() => void create()}
                    >
                        <Link2 aria-hidden /> {progress !== null ? 'Encrypting…' : 'Create link'}
                    </Button>
                </div>
            </section>

            <section aria-labelledby="shares-title">
                <h2 id="shares-title" className="mb-3 text-sm font-medium text-fg">
                    Your links
                </h2>
                {data.shares.length ? (
                    <ul className="space-y-3">
                        <AnimatePresence initial={false}>
                            {data.shares.map((s) => (
                                <ShareRow key={s.id} share={s} />
                            ))}
                        </AnimatePresence>
                    </ul>
                ) : (
                    <p className="text-sm text-fg-muted">No links yet.</p>
                )}
            </section>

            <Dialog open={made !== null} onOpenChange={(o) => !o && setMade(null)}>
                {made && (
                    <DialogContent
                        title="Your link is ready"
                        description="Send it privately, for example by email to your lawyer. Anyone with the full link can read it until it expires."
                    >
                        <CopyLink url={made} />
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}

function CopyLink({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="space-y-3">
            <p
                className="mono rounded-(--radius-md) border border-hairline bg-raised p-3 text-xs break-all text-fg"
                data-testid="share-link"
            >
                {url}
            </p>
            <Button
                variant="primary"
                onClick={() =>
                    void navigator.clipboard.writeText(url).then(
                        () => setCopied(true),
                        () => setCopied(false),
                    )
                }
            >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copied' : 'Copy link'}
            </Button>
        </div>
    );
}

function ShareRow({ share }: { share: ShareRecord }) {
    const session = useSession();
    const toast = useToast();
    const [status, setStatus] = useState<ShareStatus | null | undefined>(undefined);
    const [showLink, setShowLink] = useState(false);

    useEffect(() => {
        let live = true;
        void shareStatus(share.id, share.token)
            .then((s) => live && setStatus(s))
            .catch(() => live && setStatus(null));
        return () => {
            live = false;
        };
    }, [share.id, share.token]);

    const revoked = Boolean(status?.revokedAt ?? share.revokedAt);
    const expired = new Date(share.expiresAt) < new Date();
    const state = revoked ? 'Turned off' : expired ? 'Expired' : `Works until ${fmt(share.expiresAt)}`;

    const turnOff = async () => {
        try {
            await revokeShare(share.id, share.token);
            if (session.repos) await saveShare(session.repos, { ...share, revokedAt: new Date().toISOString() });
            setStatus((s) => (s ? { ...s, revokedAt: new Date().toISOString(), open: false } : s));
            toast({
                title: 'Link turned off',
                description: 'The shared copy was deleted from the server.',
                tone: 'success',
            });
        } catch (error) {
            toast({
                title: 'Not turned off',
                description: error instanceof Error ? error.message : undefined,
                tone: 'warning',
            });
        }
    };

    return (
        <MotionItem className="card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg">
                        {share.label}
                        {share.fileCount ? ` · ${share.fileCount} files` : ''}
                    </p>
                    <p className="text-fg-muted">
                        Made {fmt(share.createdAt)} · {state}
                    </p>
                </div>
                {!revoked && !expired && (
                    <>
                        <Button size="sm" variant="ghost" onClick={() => setShowLink(true)}>
                            <Copy aria-hidden /> Link
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void turnOff()}>
                            <Power aria-hidden /> Turn off
                        </Button>
                    </>
                )}
            </div>
            <div className="mt-3 border-t border-hairline pt-3">
                {status === undefined ? (
                    <Skeleton className="h-4 w-40" />
                ) : status === null ? (
                    <p className="text-fg-subtle">View history is not available offline.</p>
                ) : status.views.length ? (
                    <details>
                        <summary className="flex cursor-pointer items-center gap-2 text-fg-muted">
                            <Eye className="size-4" aria-hidden /> Opened {status.views.length}{' '}
                            {status.views.length === 1 ? 'time' : 'times'}, last {fmt(status.views[0]!.at)}
                        </summary>
                        <ul className="mt-2 space-y-1 text-fg-muted">
                            {status.views.map((v, i) => (
                                <li key={i}>
                                    {fmt(v.at)} · {v.device}
                                </li>
                            ))}
                        </ul>
                    </details>
                ) : (
                    <p className="flex items-center gap-2 text-fg-subtle">
                        <Eye className="size-4" aria-hidden /> Not opened yet
                    </p>
                )}
            </div>
            <Dialog open={showLink} onOpenChange={setShowLink}>
                <DialogContent title="Share link" description="Anyone with the full link can read it until it expires.">
                    <CopyLink url={shareUrl(location.origin, share.id, share.key)} />
                </DialogContent>
            </Dialog>
        </MotionItem>
    );
}
