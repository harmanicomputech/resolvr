import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { fingerprintAt, parseVerification } from '@/lib/integrity';

import { useData } from '../../hooks/use-data';

/**
 * Opened from a case file's QR code. Recomputes the export fingerprint from
 * this device's record and says whether the copy matches. The details travel
 * in the URL fragment, so no server ever sees them.
 */
export default function Verify() {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const parsed = parseVerification(hash);
    const { data, loading } = useData(
        async (repos) => {
            if (!parsed) return null;
            const [ledger, files, incidents] = await Promise.all([
                repos.incidents.ledger(),
                repos.files.list({ includeDeleted: true }),
                repos.incidents.list({ includeDeleted: true }),
            ]);
            const ids = new Set(incidents.filter((i) => parsed.incIds.includes(i.incId)).map((i) => i.id));
            const shas = files.filter((f) => f.incidentIds.some((id) => ids.has(id))).map((f) => f.sha256);
            return fingerprintAt(ledger, parsed.headPrefix, parsed.incIds, shas);
        },
        [hash],
    );

    if (!parsed)
        return (
            <EmptyState icon={<ShieldQuestion className="size-6" />} title="Nothing to check">
                Open this page by scanning the code on a Resolvr case file.
            </EmptyState>
        );
    if (loading && data === undefined) return <Skeleton className="mt-6 h-40" />;
    const match = data && data.fingerprint === parsed.fingerprint;
    return (
        <div className="mx-auto max-w-lg pt-6">
            <div className="card p-6 text-center">
                <span className="icon-badge mx-auto" data-size="lg" data-tone={match ? undefined : 'warn'} aria-hidden>
                    {match ? <ShieldCheck className="size-6" /> : <ShieldAlert className="size-6" />}
                </span>
                <h2 className="mt-4 font-display text-xl font-semibold text-fg">
                    {match
                        ? 'This case file matches your record'
                        : data
                          ? 'This copy does not match'
                          : 'Not from this record'}
                </h2>
                <p className="mt-2 text-sm text-fg-muted">
                    {match
                        ? `It covers ${parsed.incIds.length} incidents exactly as they were recorded on ${new Date(data.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`
                        : data
                          ? 'The incidents exist, but the evidence files or contents differ from when the case file was made.'
                          : 'This device does not hold the record the case file was made from.'}
                </p>
                <p className="mono mt-4 text-2xs break-all text-fg-subtle">{parsed.fingerprint}</p>
            </div>
        </div>
    );
}
