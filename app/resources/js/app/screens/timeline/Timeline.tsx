import { Flag, Lightbulb, Sparkles, Waypoints, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearch } from 'wouter';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { severities, type Severity } from '@/lib/model/catalog';
import { detectPatterns, type Pattern } from '@/lib/patterns/detect';
import { categoryLabels, type Category } from '@/lib/timeline/layout';
import { cn } from '@/lib/utils';

import { useData } from '../../hooks/use-data';
import { useMedia } from '../../hooks/use-media';
import { useNavigate } from '../../hooks/use-navigate';
import { severityInfo } from '../log/steps';
import { HorizontalTimeline, zoomPpd, type Zoom } from './HorizontalTimeline';
import { categoryFill } from './shared';
import { VerticalTimeline } from './VerticalTimeline';

/** Timeline and patterns. "Explain" on a pattern highlights the incidents behind it. */
export default function Timeline() {
    const navigate = useNavigate();
    const desktop = useMedia('(min-width: 768px)');
    const initial = new URLSearchParams(useSearch()).get('highlight');
    const [highlight, setHighlight] = useState<Set<string>>(() => new Set(initial ? initial.split(',') : []));
    const [active, setActive] = useState<string | null>(initial ? 'from-link' : null);
    const [shown, setShown] = useState<Severity[]>([...severities]);
    const [ppd, setPpd] = useState(zoomPpd.week);
    const { data, loading } = useData(async (repos) => {
        const [incidents, people] = await Promise.all([repos.incidents.list(), repos.people.list()]);
        const peopleById = new Map(people.map((p) => [p.id, p]));
        return {
            incidents,
            peopleById,
            patterns: detectPatterns(incidents, peopleById, {
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
        };
    });
    const visible = useMemo(
        () => (data ? data.incidents.filter((i) => shown.includes(i.content.severity)) : []),
        [data, shown],
    );

    if (loading && !data) return <Skeleton className="mt-4 h-96" />;
    if (!data) return null;
    if (!data.incidents.length)
        return (
            <EmptyState
                icon={<Waypoints className="size-6" />}
                title="Your timeline starts with your first incident"
                action={
                    <Button variant="primary" onClick={() => navigate('/log')}>
                        Log an incident
                    </Button>
                }
            >
                As you log more, you will see when things happened, who was involved and how it changed.
            </EmptyState>
        );

    const zoom: Zoom = ppd >= 25 ? 'day' : ppd >= 5 ? 'week' : 'month';
    const explain = (p: Pattern) => {
        const key = p.kind + p.title;
        if (active === key) {
            setActive(null);
            setHighlight(new Set());
        } else {
            setActive(key);
            setHighlight(new Set(p.incidentIds));
        }
    };
    const alert = data.patterns.find((p) => p.tone === 'attention');

    return (
        <div className="space-y-4 pt-2">
            {alert && (
                <div className="flex items-start gap-3 rounded-(--radius-lg) border border-sev-high-border bg-sev-high-tint p-4 text-sm">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-sev-high-text" aria-hidden />
                    <p className="flex-1 text-fg">
                        <span className="font-medium">{alert.title}.</span>{' '}
                        <span className="text-fg-muted">{alert.detail}</span>
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => explain(alert)}>
                        {active === alert.kind + alert.title ? 'Clear' : 'Show me'}
                    </Button>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {severities.map((s) => (
                    <Chip
                        key={s}
                        selected={shown.includes(s)}
                        onSelectedChange={(on) => setShown(on ? [...shown, s] : shown.filter((x) => x !== s))}
                    >
                        {severityInfo[s].label}
                    </Chip>
                ))}
                {desktop && (
                    <SegmentedControl
                        label="Zoom"
                        className="ml-auto"
                        value={zoom}
                        onValueChange={(z) => setPpd(zoomPpd[z])}
                        options={[
                            { value: 'day', label: 'Day' },
                            { value: 'week', label: 'Week' },
                            { value: 'month', label: 'Month' },
                        ]}
                    />
                )}
            </div>

            <Legend />

            {highlight.size > 0 && (
                <p className="flex items-center gap-2 text-sm text-fg-muted" role="status">
                    Highlighting {highlight.size} {highlight.size === 1 ? 'incident' : 'incidents'}.
                    <Button size="sm" variant="ghost" onClick={() => (setHighlight(new Set()), setActive(null))}>
                        <X aria-hidden /> Clear
                    </Button>
                </p>
            )}

            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                <div className="min-w-0">
                    {desktop ? (
                        <HorizontalTimeline
                            incidents={visible}
                            peopleById={data.peopleById}
                            ppd={ppd}
                            onPpd={setPpd}
                            highlight={highlight}
                        />
                    ) : (
                        <VerticalTimeline incidents={visible} peopleById={data.peopleById} highlight={highlight} />
                    )}
                </div>
                <aside className="card h-fit p-5" aria-labelledby="patterns-title">
                    <h2 id="patterns-title" className="flex items-center gap-2 text-sm font-medium text-fg">
                        <Sparkles className="size-4 text-fg-subtle" aria-hidden /> Patterns
                    </h2>
                    {data.patterns.length ? (
                        <ul className="mt-3 space-y-3">
                            {data.patterns.map((p) => {
                                const key = p.kind + p.title;
                                return (
                                    <li
                                        key={key}
                                        className={cn(
                                            '-mx-2 rounded-(--radius-md) p-2 transition-colors',
                                            active === key && 'bg-accent-tint',
                                        )}
                                    >
                                        <p className="text-sm font-medium text-fg">{p.title}</p>
                                        <p className="text-xs text-fg-muted">{p.detail}</p>
                                        {p.incidentIds.length > 0 && (
                                            <button
                                                type="button"
                                                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline"
                                                aria-pressed={active === key}
                                                onClick={() => explain(p)}
                                            >
                                                <Lightbulb className="size-3" aria-hidden />{' '}
                                                {active === key ? 'Stop highlighting' : 'Explain'}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-fg-muted">Patterns show up as your record grows.</p>
                    )}
                    <p className="mt-4 text-xs text-fg-subtle">
                        Patterns describe your record. They are not legal findings.
                    </p>
                </aside>
            </div>
        </div>
    );
}

function Legend() {
    return (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
            {(Object.keys(categoryLabels) as Category[]).map((c) => (
                <li key={c} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: categoryFill[c] }} aria-hidden />
                    {categoryLabels[c]}
                </li>
            ))}
            <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm bg-[var(--chart-window)]" aria-hidden />
                30 days after a report
            </li>
            <li className="flex items-center gap-1.5">
                <Flag className="size-3" aria-hidden />
                Reported
            </li>
            <li>Larger dots are more serious.</li>
        </ul>
    );
}
