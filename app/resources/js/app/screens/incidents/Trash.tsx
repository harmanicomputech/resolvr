import { ArchiveRestore, ArrowLeft, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SeverityPill } from '@/components/ui/severity-pill';

import { MotionItem } from '../../components/motion-item';
import { useToast } from '../../components/toaster';
import { useData } from '../../hooks/use-data';
import { NavLink } from '../../shell/NavLink';
import { useSession } from '../../session';

const DAY = 86_400_000;

/**
 * Trash: incidents removed in the last 30 days, restorable. Their history
 * stays in the ledger permanently, so the chain never has a gap.
 */
export default function Trash() {
    const session = useSession();
    const toast = useToast();
    const [busy, setBusy] = useState<string | null>(null);
    const { data } = useData(async (repos) => {
        const now = Date.now();
        return (await repos.incidents.list({ includeDeleted: true }))
            .filter((i) => i.deletedAt)
            .map((i) => ({ ...i, daysLeft: Math.max(0, 30 - Math.floor((now - Date.parse(i.deletedAt!)) / DAY)) }));
    });

    return (
        <div className="mx-auto max-w-3xl space-y-4 pt-2">
            <NavLink href="/incidents" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
                <ArrowLeft className="size-4" aria-hidden /> All incidents
            </NavLink>
            <h2 className="font-display text-xl font-semibold text-fg">Trash</h2>
            <p className="text-sm text-fg-muted">
                Restore anything here within 30 days. Their history always stays in your record, so nothing disappears
                from the chain.
            </p>
            {!data?.length ? (
                <EmptyState icon={<Trash2 className="size-6" />} title="Trash is empty" />
            ) : (
                <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                        {data.map((i) => {
                            const { daysLeft } = i;
                            return (
                                <MotionItem key={i.id} className="card flex flex-wrap items-center gap-3 p-4">
                                    <SeverityPill severity={i.content.severity} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-fg">{i.content.title}</p>
                                        <p className="text-xs text-fg-subtle">
                                            <span className="mono">{i.incId}</span> ·{' '}
                                            {daysLeft
                                                ? `${daysLeft} days left to restore`
                                                : 'Kept until you restore it'}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        disabled={busy === i.id}
                                        onClick={async () => {
                                            setBusy(i.id);
                                            await session.repos?.incidents.restore(i.id);
                                            session.refresh();
                                            setBusy(null);
                                            toast({ title: `${i.incId} restored`, tone: 'success' });
                                        }}
                                    >
                                        <ArchiveRestore aria-hidden /> Restore
                                    </Button>
                                </MotionItem>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            )}
        </div>
    );
}
