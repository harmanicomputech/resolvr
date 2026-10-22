import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Coverage, LawPack, Statute } from '@/lib/laws/coverage';
import type { DeadlineSummary } from '@/lib/laws/deadlines';
import { cn } from '@/lib/utils';

const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

function reviewNote(pack: LawPack): string {
    return pack.reviewedBy ? `Reviewed by ${pack.reviewedBy}.` : 'Not yet reviewed by a lawyer.';
}

export function ExternalLinkButton({ href, children }: { href: string; children: string }) {
    return (
        <a href={href} target="_blank" rel="noreferrer noopener" className="btn" data-size="sm">
            {children} <ExternalLink aria-hidden />
        </a>
    );
}

/**
 * A calm countdown to the earliest time limit the record suggests, with a
 * route to a lawyer. Never alarming: no red, no flashing, plain words.
 */
export function DeadlineTracker({ summary, pack }: { summary: DeadlineSummary; pack: LawPack }) {
    const { next, deadlines, somePassed } = summary;
    if (!deadlines.length)
        return (
            <div className="text-sm text-fg-muted">
                <p>No time limits to show yet. They appear here when your entries suggest a law that has one.</p>
                <Footnote pack={pack} />
            </div>
        );

    const others = deadlines.filter((d) => d !== next?.deadline).slice(0, 3);
    const limit = next?.deadline.statute.limitation;
    const elapsed = next && limit ? Math.min(1, Math.max(0, 1 - next.daysLeft / limit.days)) : 1;

    return (
        <div className="flex flex-col gap-4 text-sm">
            {next && limit ? (
                <div>
                    <p className="font-display text-2xl font-semibold text-fg tabular-nums" data-testid="deadline-days">
                        {next.daysLeft === 0
                            ? 'Today'
                            : `About ${next.daysLeft} ${next.daysLeft === 1 ? 'day' : 'days'}`}
                    </p>
                    <p className="text-fg">
                        {limit.label} <span className="text-fg-muted">({next.deadline.statute.short})</span>
                    </p>
                    <p className="text-fg-muted">by {fmtDate(next.date)}</p>
                    <div
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-hairline"
                        role="progressbar"
                        aria-label="Time used"
                        aria-valuenow={Math.round(elapsed * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
                        <div className="h-full rounded-full bg-accent" style={{ width: `${elapsed * 100}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-fg-muted">
                        {next.basis === 'first'
                            ? 'Counted from your first related incident, to be safe.'
                            : 'Counted from your most recent related incident.'}{' '}
                        {limit.note}
                    </p>
                </div>
            ) : (
                <p className="text-fg">
                    The usual time limits for these incidents may have passed. A lawyer can tell you what options
                    remain; there often are some.
                </p>
            )}

            {somePassed && next && (
                <p className="text-xs text-fg-muted">
                    Limits for some earlier incidents may have passed. That does not always close every option.
                </p>
            )}

            {others.length > 0 && (
                <ul className="divide-y divide-hairline border-t border-hairline">
                    {others.map((d) => (
                        <li key={d.statute.id} className="flex justify-between gap-3 py-2">
                            <span className="text-fg-muted">{d.statute.limitation!.label}</span>
                            <span className="shrink-0 text-fg tabular-nums">
                                {d.earliest.toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex flex-wrap gap-2">
                <ExternalLinkButton href={pack.lawyerHelp.url}>Talk to a lawyer</ExternalLinkButton>
                {next?.deadline.statute.agency && (
                    <a
                        href={next.deadline.statute.agency.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn"
                        data-variant="ghost"
                        data-size="sm"
                    >
                        Where to file <ExternalLink aria-hidden />
                    </a>
                )}
            </div>
            <Footnote pack={pack} />
        </div>
    );
}

function Footnote({ pack }: { pack: LawPack }) {
    return (
        <p className="text-xs text-fg-subtle">
            General information about {pack.name}, not legal advice. Time limits depend on your exact situation.{' '}
            {reviewNote(pack)}
        </p>
    );
}

/** Law chips that open a plain-language explanation. */
export function StatuteChips({ coverage }: { coverage: Coverage }) {
    const [open, setOpen] = useState<Statute | null>(null);
    return (
        <>
            <ul className="flex flex-wrap gap-2">
                {coverage.statutes.map(({ statute, active }) => (
                    <li key={statute.id}>
                        <button
                            type="button"
                            onClick={() => setOpen(statute)}
                            className={cn(
                                'chip gap-1.5',
                                active ? 'border-accent bg-accent-tint text-accent-text' : 'text-fg-subtle',
                            )}
                            aria-label={`${statute.name}: ${active ? 'may be relevant' : 'not indicated by your entries'}`}
                        >
                            {statute.short}
                        </button>
                    </li>
                ))}
            </ul>
            <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
                {open && (
                    <DialogContent
                        title={open.name}
                        description={`${coverage.pack.name} · general information, not legal advice`}
                    >
                        <div className="space-y-4 text-sm">
                            <p className="text-fg">{open.summary}</p>
                            {open.limitation && (
                                <div>
                                    <p className="font-medium text-fg">Time limit</p>
                                    <p className="text-fg-muted">
                                        {open.limitation.label}: {open.limitation.note}
                                    </p>
                                </div>
                            )}
                            {open.agency && (
                                <div>
                                    <p className="font-medium text-fg">Where to go</p>
                                    <a
                                        href={open.agency.url}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="text-accent-text underline underline-offset-2"
                                    >
                                        {open.agency.name}
                                    </a>
                                </div>
                            )}
                            <p className="text-xs text-fg-subtle">{reviewNote(coverage.pack)}</p>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </>
    );
}
