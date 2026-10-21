import { Flag } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { SeverityPill } from '@/components/ui/severity-pill';
import type { Incident, Person } from '@/lib/model/schema';
import { categoryOf, reportMarkers } from '@/lib/timeline/layout';
import { cn } from '@/lib/utils';

import { NavLink } from '../../shell/NavLink';
import { categoryFill, severityRadius } from './shared';

type Item =
    { at: number; kind: 'incident'; incident: Incident } | { at: number; kind: 'report' | 'window-end'; to: string };

/** Phones: a vertical timeline grouped by month, newest first, with report markers and window ends. */
export function VerticalTimeline({
    incidents,
    peopleById,
    highlight,
}: {
    incidents: Incident[];
    peopleById: Map<string, Person>;
    highlight: Set<string>;
}) {
    const reduce = useReducedMotion();
    const items: Item[] = [
        ...incidents.map((incident) => ({ at: Date.parse(incident.occurredAt), kind: 'incident' as const, incident })),
        ...reportMarkers(incidents).flatMap((r) => [
            { at: r.at.getTime(), kind: 'report' as const, to: r.to },
            { at: r.windowEnd.getTime(), kind: 'window-end' as const, to: r.to },
        ]),
    ].sort((a, b) => b.at - a.at);

    const groups: { label: string; items: Item[] }[] = [];
    for (const item of items) {
        const label = new Date(item.at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const last = groups.at(-1);
        if (last?.label === label) last.items.push(item);
        else groups.push({ label, items: [item] });
    }
    const dim = highlight.size > 0;

    return (
        <ol className="space-y-6">
            {groups.map((g) => (
                <li key={g.label}>
                    <h3 className="eyebrow sticky top-16 z-10 bg-bg/90 py-1 backdrop-blur-sm">{g.label}</h3>
                    <ol className="relative mt-2 ml-3 border-l-2 border-hairline">
                        {g.items.map((item, idx) => (
                            <motion.li
                                key={idx}
                                className="relative pb-4 pl-6"
                                initial={reduce ? false : { opacity: 0, x: -6 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                            >
                                {item.kind === 'incident' ? (
                                    <IncidentItem
                                        incident={item.incident}
                                        person={peopleById.get(item.incident.content.responsibleIds[0] ?? '')?.name}
                                        dimmed={dim && !highlight.has(item.incident.id)}
                                        marked={dim && highlight.has(item.incident.id)}
                                    />
                                ) : (
                                    <Marker>
                                        {item.kind === 'report'
                                            ? `Reported${item.to ? ` to ${item.to}` : ''}`
                                            : '30 days after the report'}
                                        <span className="ml-2 text-fg-subtle">
                                            {new Date(item.at).toLocaleDateString(undefined, {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </span>
                                    </Marker>
                                )}
                            </motion.li>
                        ))}
                    </ol>
                </li>
            ))}
        </ol>
    );
}

function IncidentItem({
    incident,
    person,
    dimmed,
    marked,
}: {
    incident: Incident;
    person?: string;
    dimmed: boolean;
    marked: boolean;
}) {
    const r = severityRadius[incident.content.severity];
    return (
        <>
            <span
                className="absolute top-3 -left-px -translate-x-1/2 rounded-full ring-2 ring-bg"
                style={{ width: r * 2, height: r * 2, background: categoryFill[categoryOf(incident.content.types)] }}
                aria-hidden
            />
            <NavLink
                href={`/incidents/${incident.id}`}
                className={cn(
                    'card block p-3 transition-opacity',
                    dimmed && 'opacity-40',
                    marked && 'ring-2 ring-accent',
                )}
            >
                <div className="flex items-center gap-2 text-xs text-fg-subtle">
                    <SeverityPill severity={incident.content.severity} />
                    <span className="mono">{incident.incId}</span>
                    <span className="ml-auto">
                        {new Date(incident.occurredAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                        })}
                    </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-fg">{incident.content.title}</p>
                {person && <p className="text-xs text-fg-muted">{person}</p>}
            </NavLink>
        </>
    );
}

function Marker({ children }: { children: ReactNode }) {
    return (
        <>
            <span
                className="absolute top-1 -left-px grid size-5 -translate-x-1/2 place-items-center rounded-full bg-surface ring-2 ring-hairline-strong"
                aria-hidden
            >
                <Flag className="size-3 text-fg-muted" />
            </span>
            <p className="rounded-(--radius-md) bg-[var(--chart-window)] px-3 py-1.5 text-xs font-medium text-fg">
                {children}
            </p>
        </>
    );
}
