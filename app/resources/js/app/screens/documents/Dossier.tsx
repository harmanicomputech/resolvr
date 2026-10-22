import { ArrowLeft, Download, FolderArchive, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { useToast } from '../../components/toaster';
import type { DossierOptions, Package } from '../../pdf/dossier/data';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';
import { PdfPreview } from './PdfPreview';

const packages = [
    { value: 'hr', label: 'HR package' },
    { value: 'legal', label: 'Legal package' },
] as const;

/** The case file: the whole record as a PDF, made and previewed on this device. */
export default function Dossier() {
    const session = useSession();
    const toast = useToast();
    const [options, setOptions] = useState<DossierOptions>({ pkg: 'hr', includeImpact: true, includeThumbnails: true });
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

    const prepare = async () => {
        if (!session.repos) return;
        setBusy(true);
        setResult(null);
        try {
            const [{ gatherDossier }, { renderDossier }, { safeFilename }] = await Promise.all([
                import('../../pdf/dossier/data'),
                import('../../pdf/dossier/render'),
                import('../../pdf/download'),
            ]);
            const data = await gatherDossier(session.repos, options, window.location.origin);
            if (!data.incidents.length) {
                toast({ title: 'No incidents in that period', tone: 'info' });
                return;
            }
            const blob = await renderDossier(data);
            const who = safeFilename(data.profile.fullName || 'record');
            setResult({
                blob,
                name: `Resolvr-${options.pkg === 'hr' ? 'HR' : 'Legal'}-case-file-${who}-${data.generatedAt.slice(0, 10)}.pdf`,
            });
        } catch (error) {
            console.warn('Case file failed', error);
            toast({ title: 'The case file could not be made', description: 'Please try again.', tone: 'danger' });
        } finally {
            setBusy(false);
        }
    };

    const set = <K extends keyof DossierOptions>(key: K, value: DossierOptions[K]) => {
        setOptions({ ...options, [key]: value });
        setResult(null);
    };

    return (
        <div className="pt-2">
            <NavLink
                href="/documents"
                className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
            >
                <ArrowLeft className="size-4" aria-hidden /> Documents
            </NavLink>
            <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
                <section className="card h-fit space-y-5 p-5" aria-labelledby="dossier-title">
                    <div className="flex items-center gap-3">
                        <span className="icon-badge" aria-hidden>
                            <FolderArchive className="size-4" />
                        </span>
                        <h2 id="dossier-title" className="font-display text-lg font-semibold text-fg">
                            Case file
                        </h2>
                    </div>
                    <div>
                        <SegmentedControl
                            label="Package"
                            value={options.pkg}
                            onValueChange={(v: Package) => set('pkg', v)}
                            options={packages}
                            className="w-full"
                        />
                        <p className="mt-2 text-xs text-fg-muted">
                            {options.pkg === 'hr'
                                ? 'In colour, for HR or a manager.'
                                : 'Black and white, so it copies and faxes cleanly, for a lawyer or tribunal.'}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="From">
                            <Input
                                type="date"
                                value={options.from ?? ''}
                                onChange={(e) => set('from', e.target.value || undefined)}
                            />
                        </Field>
                        <Field label="To">
                            <Input
                                type="date"
                                value={options.to ?? ''}
                                onChange={(e) => set('to', e.target.value || undefined)}
                            />
                        </Field>
                    </div>
                    <label className="flex items-start gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-[var(--accent)]"
                            checked={options.includeImpact}
                            onChange={(e) => set('includeImpact', e.target.checked)}
                        />
                        <span>
                            <span className="text-fg">Include how it has affected you</span>
                            <span className="block text-xs text-fg-muted">
                                Your impact notes and statements. Leave out if you would rather not share them.
                            </span>
                        </span>
                    </label>
                    {options.includeImpact && (
                        <label className="flex items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="mt-0.5 size-4 accent-[var(--accent)]"
                                checked={options.includeWellbeing ?? false}
                                onChange={(e) => set('includeWellbeing', e.target.checked)}
                            />
                            <span>
                                <span className="text-fg">Include wellbeing check-ins</span>
                                <span className="block text-xs text-fg-muted">
                                    Monthly averages from your daily check-ins. Your notes stay private.
                                </span>
                            </span>
                        </label>
                    )}
                    <label className="flex items-start gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-[var(--accent)]"
                            checked={options.includeThumbnails}
                            onChange={(e) => set('includeThumbnails', e.target.checked)}
                        />
                        <span className="text-fg">Include small previews of images</span>
                    </label>
                    <Button variant="primary" className="w-full" onClick={() => void prepare()} disabled={busy}>
                        {busy ? (
                            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
                        ) : (
                            <FolderArchive aria-hidden />
                        )}{' '}
                        {busy ? 'Preparing…' : 'Prepare case file'}
                    </Button>
                    {result && (
                        <Button
                            className="w-full"
                            onClick={async () => {
                                const { saveBlob } = await import('../../pdf/download');
                                saveBlob(result.blob, result.name);
                            }}
                        >
                            <Download aria-hidden /> Download PDF
                        </Button>
                    )}
                    <p className="text-xs text-fg-subtle">
                        Made on this device: nothing is uploaded. The downloaded file is not encrypted, so keep it
                        somewhere private. Not legal advice.
                    </p>
                </section>
                <section className="card grid min-h-[60vh] place-items-center p-6" aria-label="Preview">
                    {result ? (
                        <PdfPreview blob={result.blob} />
                    ) : (
                        <p className="max-w-sm text-center text-sm text-fg-muted">
                            Choose a package and select “Prepare case file” to see a preview here before you download
                            it.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}
