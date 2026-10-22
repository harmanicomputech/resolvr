import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { Incident, Person } from '@/lib/model/schema';
import { categoryOf, lanesFor, reportMarkers, severityTrend } from '@/lib/timeline/layout';

import { useNavigate } from '../../hooks/use-navigate';
import { categoryFill, DAY, severityRadius } from './shared';

export type Zoom = 'day' | 'week' | 'month';
export const zoomPpd: Record<Zoom, number> = { day: 44, week: 10, month: 2.6 };

const LANE = 64;
const TREND = 72;
const AXIS = 32;
const LABELS = 148;

interface Props {
    incidents: Incident[];
    peopleById: Map<string, Person>;
    ppd: number;
    onPpd: (ppd: number) => void;
    highlight: Set<string>;
}

/** Desktop timeline: time runs left to right, one lane per person; scroll to pan, pinch or Ctrl+scroll to zoom. */
export function HorizontalTimeline({ incidents, peopleById, ppd, onPpd, highlight }: Props) {
    const navigate = useNavigate();
    const reduce = useReducedMotion();
    const scroller = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<Incident | null>(null);
    const lanes = useMemo(() => lanesFor(incidents, peopleById), [incidents, peopleById]);
    const reports = useMemo(() => reportMarkers(incidents), [incidents]);
    const trend = useMemo(() => severityTrend(incidents), [incidents]);

    const times = [
        ...incidents.map((i) => Date.parse(i.occurredAt)),
        ...reports.flatMap((r) => [r.at.getTime(), r.windowEnd.getTime()]),
    ];
    const [now] = useState(() => Date.now());
    const start = Math.min(...times, now) - 10 * DAY;
    const end = Math.max(...times, now) + 10 * DAY;
    const width = Math.max(600, ((end - start) / DAY) * ppd);
    const height = TREND + lanes.length * LANE + AXIS;
    const x = (t: number) => ((t - start) / DAY) * ppd;
    const laneOf = new Map(lanes.flatMap((l, idx) => l.incidentIds.map((id) => [id, idx])));

    // Several incidents on the same day in the same lane fan out vertically.
    const offsets = new Map<string, number>();
    const seen = new Map<string, number>();
    for (const i of [...incidents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
        const key = `${laneOf.get(i.id)}-${Math.floor(x(Date.parse(i.occurredAt)) / 14)}`;
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        offsets.set(i.id, n === 0 ? 0 : (n % 2 ? -1 : 1) * Math.ceil(n / 2) * 12);
    }

    // Month (and, zoomed in, day) ticks.
    const ticks: { t: number; label: string; major: boolean }[] = [];
    const d = new Date(start);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= end) {
        ticks.push({
            t: d.getTime(),
            label: d.toLocaleDateString(undefined, {
                month: 'short',
                year: d.getMonth() === 0 ? 'numeric' : undefined,
            }),
            major: true,
        });
        d.setMonth(d.getMonth() + 1);
    }
    if (ppd >= 20) {
        for (let t = start - (start % DAY); t <= end; t += DAY * (ppd >= 40 ? 1 : 7)) {
            const day = new Date(t);
            if (day.getDate() !== 1) ticks.push({ t, label: String(day.getDate()), major: false });
        }
    }

    // First view: fit the whole record on screen, then keep the most recent end in view.
    const fitted = useRef(false);
    useLayoutEffect(() => {
        const el = scroller.current;
        if (!el) return;
        if (!fitted.current) {
            fitted.current = true;
            const fit = Math.min(44, Math.max(1.5, (el.clientWidth - 24) / ((end - start) / DAY)));
            if (Math.abs(fit - ppd) > 0.1) onPpd(fit);
        }
        el.scrollLeft = el.scrollWidth;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pinch (trackpad Ctrl+wheel, or two fingers) zooms around the pointer.
    const ppdRef = useRef(ppd);
    useEffect(() => {
        ppdRef.current = ppd;
    }, [ppd]);
    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const zoomAt = (factor: number, clientX: number) => {
            const rect = el.getBoundingClientRect();
            const anchor = el.scrollLeft + clientX - rect.left;
            const next = Math.min(80, Math.max(1.5, ppdRef.current * factor));
            const ratio = next / ppdRef.current;
            ppdRef.current = next;
            onPpd(next);
            requestAnimationFrame(() => (el.scrollLeft = anchor * ratio - (clientX - rect.left)));
        };
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX);
        };
        const pointers = new Map<number, number>();
        let last = 0;
        const down = (e: PointerEvent) => e.pointerType === 'touch' && pointers.set(e.pointerId, e.clientX);
        const move = (e: PointerEvent) => {
            if (!pointers.has(e.pointerId)) return;
            pointers.set(e.pointerId, e.clientX);
            if (pointers.size !== 2) return;
            const [a, b] = [...pointers.values()] as [number, number];
            const dist = Math.abs(a - b);
            if (last) zoomAt(dist / last, (a + b) / 2);
            last = dist;
        };
        const up = (e: PointerEvent) => {
            pointers.delete(e.pointerId);
            last = 0;
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        return () => {
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('pointerdown', down);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
        };
    }, [onPpd]);

    const trendY = (v: number) => 12 + (1 - (v - 1) / 3) * (TREND - 28);
    const trendPath = trend.map((p, idx) => `${idx ? 'L' : 'M'}${x(p.at.getTime())},${trendY(p.value)}`).join(' ');
    const dim = highlight.size > 0;

    return (
        <div className="card relative overflow-hidden p-0">
            <div className="flex">
                {/* Lane labels stay put while the chart scrolls. */}
                <div
                    className="shrink-0 border-r border-hairline bg-surface text-xs"
                    style={{ width: LABELS }}
                    aria-hidden
                >
                    <div className="flex items-center px-3 text-fg-subtle" style={{ height: TREND }}>
                        Severity trend
                    </div>
                    {lanes.map((l) => (
                        <div
                            key={l.id}
                            className="flex items-center border-t border-hairline px-3 font-medium text-fg"
                            style={{ height: LANE }}
                        >
                            <span className="truncate">{l.label}</span>
                        </div>
                    ))}
                </div>
                <div
                    ref={scroller}
                    className="relative min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
                    tabIndex={0}
                    aria-label="Timeline. Scroll sideways to move through time; hold Control and scroll to zoom."
                >
                    <div className="relative" style={{ width, height }}>
                        <svg width={width} height={height} className="block" role="presentation">
                            {ticks.map((tick) => (
                                <g key={`${tick.t}-${tick.major}`}>
                                    <line
                                        x1={x(tick.t)}
                                        x2={x(tick.t)}
                                        y1={0}
                                        y2={height - AXIS}
                                        stroke="var(--chart-grid)"
                                        strokeWidth={tick.major ? 1 : 0.5}
                                    />
                                    <text
                                        x={x(tick.t) + 4}
                                        y={height - 12}
                                        className={
                                            tick.major
                                                ? 'fill-fg-muted text-2xs font-medium'
                                                : 'fill-fg-subtle text-2xs'
                                        }
                                    >
                                        {tick.label}
                                    </text>
                                </g>
                            ))}
                            {lanes.map((l, idx) => (
                                <line
                                    key={l.id}
                                    x1={0}
                                    x2={width}
                                    y1={TREND + idx * LANE}
                                    y2={TREND + idx * LANE}
                                    stroke="var(--hairline)"
                                />
                            ))}
                            {reports.map((r) => (
                                <g key={`w-${r.incidentId}`}>
                                    <rect
                                        x={x(r.at.getTime())}
                                        y={TREND}
                                        width={x(r.windowEnd.getTime()) - x(r.at.getTime())}
                                        height={lanes.length * LANE}
                                        fill="var(--chart-window)"
                                    />
                                    <line
                                        x1={x(r.at.getTime())}
                                        x2={x(r.at.getTime())}
                                        y1={4}
                                        y2={height - AXIS}
                                        stroke="var(--fg-muted)"
                                        strokeWidth={1.5}
                                    />
                                    <rect
                                        x={x(r.at.getTime()) + 2}
                                        y={4}
                                        rx={4}
                                        width={76}
                                        height={18}
                                        fill="var(--surface)"
                                        stroke="var(--hairline-strong)"
                                    />
                                    <text x={x(r.at.getTime()) + 8} y={16.5} className="fill-fg text-2xs font-medium">
                                        Reported
                                    </text>
                                </g>
                            ))}
                            <line x1={0} x2={width} y1={trendY(2.5)} y2={trendY(2.5)} stroke="var(--chart-grid)" />
                            {trend.length > 1 && (
                                <motion.path
                                    d={trendPath}
                                    fill="none"
                                    stroke="var(--fg-muted)"
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    initial={reduce ? false : { pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            )}
                            {incidents.map((i, idx) => {
                                const lane = laneOf.get(i.id) ?? 0;
                                const cx = x(Date.parse(i.occurredAt));
                                const cy = TREND + lane * LANE + LANE / 2 + (offsets.get(i.id) ?? 0);
                                const on = !dim || highlight.has(i.id);
                                return (
                                    <motion.g
                                        key={i.id}
                                        role="link"
                                        tabIndex={0}
                                        aria-label={`${i.incId}, ${i.content.title}, ${new Date(i.occurredAt).toLocaleDateString()}, ${i.content.severity}`}
                                        className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-accent"
                                        initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                                        animate={{ opacity: on ? 1 : 0.2, scale: 1 }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 400,
                                            damping: 26,
                                            delay: reduce ? 0 : Math.min(idx, 20) * 0.02,
                                        }}
                                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                                        onMouseEnter={() => setHover(i)}
                                        onMouseLeave={() => setHover(null)}
                                        onFocus={() => setHover(i)}
                                        onBlur={() => setHover(null)}
                                        onClick={() => navigate(`/incidents/${i.id}`)}
                                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/incidents/${i.id}`)}
                                    >
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={severityRadius[i.content.severity] + 6}
                                            fill="transparent"
                                            stroke={dim && on ? 'var(--accent)' : 'transparent'}
                                            strokeWidth={2}
                                        />
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={severityRadius[i.content.severity]}
                                            fill={categoryFill[categoryOf(i.content.types)]}
                                            stroke="var(--surface)"
                                            strokeWidth={2}
                                        />
                                    </motion.g>
                                );
                            })}
                        </svg>
                        {hover && (
                            <div
                                className="pointer-events-none absolute z-10 w-64 -translate-x-1/2 -translate-y-full rounded-(--radius-md) border border-hairline bg-surface p-3 text-xs shadow-(--shadow-floating)"
                                style={{
                                    left: Math.min(Math.max(x(Date.parse(hover.occurredAt)), 132), width - 132),
                                    top: TREND + (laneOf.get(hover.id) ?? 0) * LANE + LANE / 2 - 16,
                                }}
                            >
                                <p className="mono text-fg-subtle">{hover.incId}</p>
                                <p className="mt-0.5 font-medium text-fg">{hover.content.title}</p>
                                <p className="mt-1 text-fg-muted">
                                    {new Date(hover.occurredAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}{' '}
                                    · {hover.content.severity} · {hover.content.types.slice(0, 2).join(', ')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
