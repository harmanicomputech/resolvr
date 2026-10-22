import { AlertCircle, ArrowRight, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { SeverityPill } from '@/components/ui/severity-pill';
import type { Coverage } from '@/lib/laws/coverage';
import type { Incident } from '@/lib/model/schema';
import type { Pattern, PatternTone } from '@/lib/patterns/detect';
import type { CaseStats } from '@/lib/scoring/stats';

import { CountUp } from '../../components/count-up';
import { NavLink } from '../../shell/NavLink';
import { StatuteChips } from './Deadlines';

/** Four headline numbers. */
export function StatTiles({ stats }: { stats: CaseStats }) {
    const tiles: { label: string; value: ReactNode; hint?: string }[] = [
        { label: 'Incidents', value: <CountUp value={stats.total} /> },
        { label: 'Serious', value: <CountUp value={stats.serious} />, hint: 'High or critical' },
        {
            label: 'Since the last one',
            value:
                stats.daysSinceLast === null ? (
                    '–'
                ) : stats.daysSinceLast === 0 ? (
                    'Today'
                ) : (
                    <>
                        <CountUp value={stats.daysSinceLast} /> {stats.daysSinceLast === 1 ? 'day' : 'days'}
                    </>
                ),
        },
        {
            label: 'Most involved',
            value: stats.topPerson?.person?.name ?? '–',
            hint: stats.topPerson
                ? `${stats.topPerson.count} ${stats.topPerson.count === 1 ? 'incident' : 'incidents'}`
                : undefined,
        },
    ];
    return (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
                <div key={t.label} className="card p-4">
                    <dt className="stat-label">{t.label}</dt>
                    <dd className="mt-1 truncate font-display text-2xl font-semibold text-fg">{t.value}</dd>
                    {t.hint && <dd className="text-xs text-fg-subtle">{t.hint}</dd>}
                </div>
            ))}
        </dl>
    );
}

const toneIcon: Record<PatternTone, { icon: typeof Info; tone?: string }> = {
    attention: { icon: TriangleAlert, tone: 'warn' },
    notice: { icon: AlertCircle, tone: 'warn' },
    info: { icon: Info },
    positive: { icon: Lightbulb },
};

export function PatternList({ patterns }: { patterns: Pattern[] }) {
    if (!patterns.length)
        return (
            <p className="text-sm text-fg-muted">
                No patterns yet. They appear as your record grows; three or more incidents usually show the first ones.
            </p>
        );
    return (
        <ul className="space-y-3">
            {patterns.map((p) => {
                const { icon: Icon, tone } = toneIcon[p.tone];
                return (
                    <li key={p.kind + p.title} className="flex gap-3">
                        <span className="icon-badge size-8" data-tone={tone} aria-hidden>
                            <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 text-sm">
                            <p className="font-medium text-fg">{p.title}</p>
                            <p className="text-fg-muted">{p.detail}</p>
                            {p.incidentIds.length > 0 && (
                                <NavLink
                                    href={`/timeline?highlight=${p.incidentIds.join(',')}`}
                                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline"
                                >
                                    Show on timeline <ArrowRight className="size-3" aria-hidden />
                                </NavLink>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export function CoverageChips({ coverage }: { coverage: Coverage }) {
    return (
        <div>
            <StatuteChips coverage={coverage} />
            <p className="mt-4 text-xs text-fg-subtle">
                Laws that may relate to what you have logged. Tap one for a plain explanation. General information, not
                legal advice.
            </p>
        </div>
    );
}

export function RecentList({ incidents }: { incidents: Incident[] }) {
    const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
    return (
        <ul className="-mx-2 divide-y divide-hairline">
            {incidents.slice(0, 5).map((i) => (
                <li key={i.id}>
                    <NavLink
                        href={`/incidents/${i.id}`}
                        className="flex items-center gap-3 rounded-(--radius-md) px-2 py-2.5 transition-colors hover:bg-raised focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
                    >
                        <SeverityPill severity={i.content.severity} />
                        <span className="min-w-0 flex-1 truncate text-sm text-fg">{i.content.title}</span>
                        <span className="mono hidden text-xs text-fg-subtle sm:inline">{i.incId}</span>
                        <span className="w-14 text-right text-xs text-fg-muted">
                            {fmt.format(new Date(i.occurredAt))}
                        </span>
                    </NavLink>
                </li>
            ))}
        </ul>
    );
}
